from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ─── Plan Information ────────────────────────────────────────────────────────

class PlanLimits(BaseModel):
    storage_bytes: int
    max_files: int          # -1 = unlimited
    max_projects: int       # -1 = unlimited
    max_meetings_per_month: int  # -1 = unlimited


class PlanInfo(BaseModel):
    name: str               # "free" | "pro"
    display_name: str       # "Free" | "Pro"
    price_monthly: int      # In paise (₹99 = 9900)
    price_yearly: int       # In paise (₹999 = 99900)
    limits: PlanLimits
    features: List[str]


class PlansResponse(BaseModel):
    plans: List[PlanInfo]


# ─── Order / Payment ────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str = Field(..., pattern=r"^pro$", description="Target plan (only 'pro' for now)")
    billing_cycle: str = Field(..., pattern=r"^(monthly|yearly)$")


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int             # In paise
    currency: str
    key_id: str             # Razorpay public key for frontend
    plan: str
    billing_cycle: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    plan: str
    status: str


# ─── Subscription Status ────────────────────────────────────────────────────

class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    billing_cycle: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CancelSubscriptionResponse(BaseModel):
    message: str
    plan: str
    status: str
    effective_until: Optional[datetime] = None
