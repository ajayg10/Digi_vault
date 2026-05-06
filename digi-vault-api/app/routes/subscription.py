from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, Payment
from app.models.file import UserStorageQuota
from app.schemas.subscription import (
    PlanInfo,
    PlanLimits,
    PlansResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    SubscriptionResponse,
    CancelSubscriptionResponse,
)
from app.services.razorpay_service import (
    RAZORPAY_KEY_ID,
    PLAN_CONFIG,
    get_plan_price,
    create_order,
    verify_payment_signature,
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/subscription", tags=["Subscription"])


# ─── Helpers ────────────────────────────────────────────────────────────────

def get_or_create_subscription(db: Session, user_id: str) -> Subscription:
    """Get existing subscription or create a free one."""
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        sub = Subscription(user_id=user_id, plan="free", status="active")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def update_user_plan(db: Session, user: User, plan: str):
    """Update the user's plan field and adjust storage quota."""
    user.plan = plan
    # Update quota
    quota = db.query(UserStorageQuota).filter(
        UserStorageQuota.user_id == user.id
    ).first()
    if quota:
        quota.total_quota_bytes = PLAN_CONFIG[plan]["limits"]["storage_bytes"]
    db.commit()


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=PlansResponse)
async def list_plans():
    """List all available plans with pricing and limits."""
    plans = []
    for key, cfg in PLAN_CONFIG.items():
        plans.append(
            PlanInfo(
                name=key,
                display_name=cfg["display_name"],
                price_monthly=cfg["price_monthly"],
                price_yearly=cfg["price_yearly"],
                limits=PlanLimits(**cfg["limits"]),
                features=cfg["features"],
            )
        )
    return PlansResponse(plans=plans)


@router.get("/status", response_model=SubscriptionResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's subscription status."""
    sub = get_or_create_subscription(db, current_user.id)
    return SubscriptionResponse(
        plan=sub.plan,
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        created_at=sub.created_at,
    )


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_payment_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Razorpay order to upgrade to the requested plan."""
    # Validate — cannot create order for free plan
    if request.plan == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a payment order for the free plan",
        )

    # Check if already on this plan
    sub = get_or_create_subscription(db, current_user.id)
    if sub.plan == request.plan and sub.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already on the {request.plan} plan",
        )

    # Calculate price
    amount = get_plan_price(request.plan, request.billing_cycle)
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan/cycle combination",
        )

    # Create Razorpay order
    receipt = f"dv_{current_user.id[:8]}_{request.plan}_{request.billing_cycle}"
    order = create_order(amount, "INR", receipt)

    # Store payment record (status = created)
    payment = Payment(
        user_id=current_user.id,
        subscription_id=sub.id,
        razorpay_order_id=order["id"],
        amount_paise=amount,
        currency="INR",
        status="created",
        plan=request.plan,
        billing_cycle=request.billing_cycle,
    )
    db.add(payment)
    db.commit()

    return CreateOrderResponse(
        order_id=order["id"],
        amount=amount,
        currency="INR",
        key_id=RAZORPAY_KEY_ID,
        plan=request.plan,
        billing_cycle=request.billing_cycle,
    )


@router.post("/verify-payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify Razorpay payment signature and activate subscription.
    This is the critical security step — never trust the frontend alone.
    """
    # Find the payment record
    payment = db.query(Payment).filter(
        Payment.razorpay_order_id == request.razorpay_order_id,
        Payment.user_id == current_user.id,
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment order not found",
        )

    if payment.status == "captured":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already verified",
        )

    # Verify signature
    is_valid = verify_payment_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature,
    )

    if not is_valid:
        payment.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed — invalid signature",
        )

    # ✅ Payment verified — activate subscription
    payment.razorpay_payment_id = request.razorpay_payment_id
    payment.razorpay_signature = request.razorpay_signature
    payment.status = "captured"

    # Update subscription
    sub = get_or_create_subscription(db, current_user.id)
    sub.plan = payment.plan
    sub.status = "active"
    sub.billing_cycle = payment.billing_cycle
    sub.current_period_start = datetime.utcnow()

    if payment.billing_cycle == "monthly":
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)
    else:
        sub.current_period_end = datetime.utcnow() + timedelta(days=365)

    # Update user's plan field for quick lookups
    update_user_plan(db, current_user, payment.plan)

    db.commit()

    return VerifyPaymentResponse(
        success=True,
        message="Payment verified! Your plan has been upgraded to Pro.",
        plan=sub.plan,
        status=sub.status,
    )


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel subscription. The user keeps Pro until the current period ends,
    then reverts to Free.
    """
    sub = get_or_create_subscription(db, current_user.id)

    if sub.plan == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already on the free plan",
        )

    sub.status = "cancelled"
    db.commit()

    return CancelSubscriptionResponse(
        message="Subscription cancelled. You'll keep Pro access until the end of your billing period.",
        plan=sub.plan,
        status="cancelled",
        effective_until=sub.current_period_end,
    )
