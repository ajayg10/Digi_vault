"""
Razorpay integration service — handles order creation and payment verification.
All monetary values are in *paise* (1 INR = 100 paise).
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import razorpay

# Load .env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in backend/.env"
    )

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ─── Plan Configuration ────────────────────────────────────────────────────

PLAN_CONFIG = {
    "free": {
        "display_name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "limits": {
            "storage_bytes": 5 * 1024 * 1024 * 1024,         # 5 GB
            "max_files": 50,
            "max_projects": 3,
            "max_meetings_per_month": 5,
        },
        "features": [
            "5 GB Storage",
            "Up to 50 files",
            "3 projects",
            "5 meetings/month",
            "Basic file management",
            "Email support",
        ],
    },
    "pro": {
        "display_name": "Pro",
        "price_monthly": 9900,       # ₹99 in paise
        "price_yearly": 99900,       # ₹999 in paise
        "limits": {
            "storage_bytes": 25 * 1024 * 1024 * 1024,   # 25 GB
            "max_files": -1,         # unlimited
            "max_projects": -1,      # unlimited
            "max_meetings_per_month": -1,  # unlimited
        },
        "features": [
            "25 GB Storage",
            "Unlimited files",
            "Unlimited projects",
            "Unlimited meetings",
            "Priority support",
            "Advanced analytics",
        ],
    },
}


def get_plan_price(plan: str, billing_cycle: str) -> int:
    """Return price in paise for the given plan + cycle."""
    cfg = PLAN_CONFIG.get(plan)
    if not cfg:
        raise ValueError(f"Unknown plan: {plan}")
    if billing_cycle == "monthly":
        return cfg["price_monthly"]
    elif billing_cycle == "yearly":
        return cfg["price_yearly"]
    raise ValueError(f"Unknown billing cycle: {billing_cycle}")


def create_order(amount_paise: int, currency: str, receipt: str) -> dict:
    """
    Create a Razorpay order.
    Returns the order dict from Razorpay (includes 'id', 'amount', etc.).
    """
    order_data = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1,  # Auto-capture
    }
    order = razorpay_client.order.create(data=order_data)
    return order


def verify_payment_signature(
    order_id: str, payment_id: str, signature: str
) -> bool:
    """
    Verify the Razorpay payment signature using HMAC SHA-256.
    This ensures the payment callback hasn't been tampered with.
    """
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
