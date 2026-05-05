from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Plan details
    plan = Column(String(20), nullable=False, default="free")  # free | pro
    status = Column(String(20), nullable=False, default="active")  # active | cancelled | expired | past_due
    billing_cycle = Column(String(20), nullable=True)  # monthly | yearly (null for free)

    # Period tracking
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    # Razorpay reference
    razorpay_subscription_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_id = Column(
        String,
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Razorpay fields
    razorpay_order_id = Column(String, nullable=False, unique=True)
    razorpay_payment_id = Column(String, nullable=True, unique=True)
    razorpay_signature = Column(String, nullable=True)

    # Amount
    amount_paise = Column(BigInteger, nullable=False)  # Amount in paise (₹99 = 9900)
    currency = Column(String(10), default="INR")

    # Status
    status = Column(String(20), nullable=False, default="created")  # created | captured | failed | refunded

    # Metadata
    plan = Column(String(20), nullable=False)  # Plan at time of purchase
    billing_cycle = Column(String(20), nullable=False)  # Cycle at time of purchase

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
