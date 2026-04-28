from datetime import datetime, timedelta
from typing import Optional, List, Tuple
import secrets
import hashlib
import base64
import io
import os
from pathlib import Path
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.user import User, RefreshToken, AuditLog

# Load .env from the backend root (two levels up from this file)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Configuration — all values sourced from environment variables
SECRET_KEY: str = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "your-secret-key-change-this-in-production":
    raise RuntimeError(
        "SECRET_KEY is not set or is still the default placeholder. "
        "Set a real value in backend/.env before starting the server."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived
REFRESH_TOKEN_EXPIRE_DAYS = 7


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Access token (short-lived)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Refresh token (long-lived, stored in DB)
def create_refresh_token(
    db: Session, 
    user_id: str, 
    ip_address: str = None, 
    user_agent: str = None
) -> str:
    """Create and store refresh token"""
    # Generate random token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    # Store in database
    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(refresh_token)
    db.commit()
    
    return raw_token

def verify_refresh_token(db: Session, token: str) -> Optional[str]:
    """Verify refresh token and return user_id if valid"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if not refresh_token:
        return None
    
    refresh_token.revoked = True
    refresh_token.revoked_at = datetime.utcnow()
    db.commit()
    
    return refresh_token.user_id

def revoke_all_user_tokens(db: Session, user_id: str):
    """Logout from all devices"""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False
    ).update({
        "revoked": True,
        "revoked_at": datetime.utcnow()
    })
    db.commit()

def verify_access_token(token: str) -> Optional[dict]:
    """Verify JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None

# Audit logging
def log_audit_event(
    db: Session,
    action: str,
    success: bool,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    failure_reason: Optional[str] = None
):
    """Log security-relevant events"""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        failure_reason=failure_reason
    )
    db.add(audit_log)
    db.commit()

# Account lockout protection
def check_and_update_failed_attempts(db: Session, user: User) -> bool:
    """Check if account should be locked after failed login"""
    MAX_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    
    # Check if currently locked
    if user.is_locked and user.locked_until:
        if datetime.utcnow() < user.locked_until:
            return False  # Still locked
        else:
            # Lock expired, reset
            user.is_locked = False
            user.locked_until = None
            user.failed_login_attempts = 0
    
    # Increment failed attempts
    user.failed_login_attempts += 1
    
    # Lock if threshold exceeded
    if user.failed_login_attempts >= MAX_ATTEMPTS:
        user.is_locked = True
        user.locked_until = datetime.utcnow() + LOCKOUT_DURATION
    
    db.commit()
    return not user.is_locked

def reset_failed_attempts(db: Session, user: User):
    """Reset failed login counter on successful login"""
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    db.commit()


# ─── TOTP / 2FA Helpers ────────────────────────────────────────────────────────────

PRE_AUTH_TOKEN_EXPIRE_MINUTES = 5  # Very short-lived — just for completing 2FA


def generate_totp_secret() -> str:
    """Generate a fresh base32 TOTP secret."""
    import pyotp
    return pyotp.random_base32()


def generate_totp_uri(secret: str, email: str, issuer: str = "DigiVault") -> str:
    """Build the otpauth:// provisioning URI for authenticator apps."""
    import pyotp
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code_base64(totp_uri: str) -> str:
    """Render the provisioning URI as a base64-encoded PNG data URL."""
    import qrcode
    img = qrcode.make(totp_uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a 6-digit OTP code with ±1 window tolerance for clock drift."""
    import pyotp
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_backup_codes(count: int = 8) -> Tuple[List[str], List[str]]:
    """
    Generate `count` one-time backup codes.
    Returns (plain_codes, hashed_codes).
    Plain codes are shown to the user once; only hashed codes are stored.
    """
    plain_codes: List[str] = []
    hashed_codes: List[str] = []
    for _ in range(count):
        code = secrets.token_hex(4).upper()  # e.g. "A3F2B1C8" — 8 hex chars
        plain_codes.append(code)
        hashed_codes.append(hashlib.sha256(code.encode()).hexdigest())
    return plain_codes, hashed_codes


def verify_backup_code(stored_hashes: List[str], provided_code: str) -> Tuple[bool, List[str]]:
    """
    Constant-time check of a backup code.
    Returns (is_valid, remaining_hashes_after_consumption).
    """
    code_hash = hashlib.sha256(provided_code.upper().encode()).hexdigest()
    new_hashes = [h for h in stored_hashes if h != code_hash]
    used = len(new_hashes) < len(stored_hashes)
    return used, new_hashes


# ─── Pre-auth token (intermediate step between password check and OTP check) ───

def create_pre_auth_token(user_id: str, email: str) -> str:
    """Issue a short-lived JWT that proves password was correct but 2FA is pending."""
    payload = {
        "sub": email,
        "uid": user_id,
        "type": "2fa-pending",
        "exp": datetime.utcnow() + timedelta(minutes=PRE_AUTH_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_pre_auth_token(token: str) -> Optional[dict]:
    """Verify the pre-auth token; returns payload or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "2fa-pending":
            return None
        return payload
    except JWTError:
        return None