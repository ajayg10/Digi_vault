from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Union
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserLogin, TokenResponse, RefreshTokenRequest, UserProfile,
    TOTPSetupResponse, TOTPVerifyRequest, TOTPDisableRequest,
    PreAuthTokenResponse, TOTPLoginVerifyRequest, BackupCodesResponse,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    verify_access_token,
    revoke_all_user_tokens,
    log_audit_event,
    check_and_update_failed_attempts,
    reset_failed_attempts,
    # 2FA helpers
    generate_totp_secret,
    generate_totp_uri,
    generate_qr_code_base64,
    verify_totp_code,
    generate_backup_codes,
    verify_backup_code,
    create_pre_auth_token,
    verify_pre_auth_token,
)
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    email: str = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return db_user


@router.post("/signup", response_model=dict)
def signup(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)

    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="REGISTER",
        success=True,
        user_id=new_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return {"message": "User created successfully"}



@router.post("/login", response_model=Union[PreAuthTokenResponse, TokenResponse])
async def login(user: UserLogin, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Check account lock
    if db_user.is_locked:
        from datetime import datetime
        if db_user.locked_until and datetime.utcnow() < db_user.locked_until:
            raise HTTPException(status_code=403, detail="Account is temporarily locked")

    if not verify_password(user.password, db_user.hashed_password):
        can_retry = check_and_update_failed_attempts(db=db, user=db_user)
        log_audit_event(
            db=db,
            action="LOGIN",
            success=False,
            user_id=db_user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            failure_reason="Invalid password",
        )
        if not can_retry:
            raise HTTPException(status_code=403, detail="Account locked due to too many failed attempts")
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # ── If 2FA is enabled, return a pre-auth token instead of full tokens ──
    if db_user.totp_enabled:
        pre_auth_token = create_pre_auth_token(user_id=db_user.id, email=db_user.email)
        log_audit_event(
            db=db,
            action="LOGIN_2FA_REQUIRED",
            success=True,
            user_id=db_user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
        )
        return PreAuthTokenResponse(pre_auth_token=pre_auth_token)

    reset_failed_attempts(db=db, user=db_user)

    access_token = create_access_token({"sub": db_user.email})
    raw_refresh_token = create_refresh_token(
        db=db,
        user_id=db_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    log_audit_event(
        db=db,
        action="LOGIN",
        success=True,
        user_id=db_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=15 * 60,  # 15 minutes in seconds
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    user_id = verify_refresh_token(db=db, token=body.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token({"sub": db_user.email})
    new_refresh_token = create_refresh_token(
        db=db,
        user_id=db_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=15 * 60,
    )


@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    revoke_all_user_tokens(db=db, user_id=current_user.id)

    log_audit_event(
        db=db,
        action="LOGOUT",
        success=True,
        user_id=current_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.email}, you are authorized!"}


@router.post("/logout-all")
def logout_all(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all refresh tokens across all devices."""
    revoke_all_user_tokens(db=db, user_id=current_user.id)

    log_audit_event(
        db=db,
        action="LOGOUT_ALL",
        success=True,
        user_id=current_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return {"message": "Logged out from all devices successfully"}


# ═════════════════════════════════════════════════════════════════
# 2FA ENDPOINTS
# ═════════════════════════════════════════════════════════════════

@router.post("/2fa/setup", response_model=TOTPSetupResponse)
def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1 of 2FA enrolment.
    Generates a new TOTP secret, stores it in the DB (NOT yet enabled),
    and returns the QR-code data URL plus one-time backup codes.
    The user must call /2fa/enable with a valid OTP to activate.
    """
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    secret = generate_totp_secret()
    totp_uri = generate_totp_uri(secret, current_user.email)
    qr_b64 = generate_qr_code_base64(totp_uri)

    # Generate backup codes — store hashes only
    plain_codes, hashed_codes = generate_backup_codes(8)

    # Persist secret + backup-code hashes (but keep totp_enabled=False)
    current_user.totp_secret = secret
    current_user.backup_codes = hashed_codes
    db.commit()

    return TOTPSetupResponse(
        totp_uri=totp_uri,
        qr_code_base64=qr_b64,
        backup_codes=plain_codes,   # shown ONCE — user must save these
    )


@router.post("/2fa/enable", response_model=UserProfile)
def enable_2fa(
    body: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 2 of 2FA enrolment.
    Verifies the OTP from the user's authenticator app; if correct, sets
    totp_enabled=True.  Must be called after /2fa/setup.
    """
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Call /2fa/setup first")

    if not verify_totp_code(current_user.totp_secret, body.totp_code):
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    current_user.totp_enabled = True
    db.commit()
    db.refresh(current_user)

    log_audit_event(
        db=db,
        action="2FA_ENABLED",
        success=True,
        user_id=current_user.id,
    )

    return current_user


@router.post("/2fa/verify-login", response_model=TokenResponse)
def verify_2fa_login(
    body: TOTPLoginVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Completes login for accounts with 2FA enabled.
    Accepts the pre_auth_token returned by /login, plus either a 6-digit
    TOTP code or an 8-character backup code.  Issues full access + refresh tokens.
    """
    payload = verify_pre_auth_token(body.pre_auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired pre-auth token")

    email: str = payload["sub"]
    user_id: str = payload["uid"]

    db_user = db.query(User).filter(User.id == user_id, User.email == email).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Try TOTP code first
    totp_valid = len(body.totp_code) == 6 and verify_totp_code(db_user.totp_secret, body.totp_code)

    # Fall back to backup code
    backup_valid = False
    if not totp_valid and db_user.backup_codes:
        backup_valid, remaining = verify_backup_code(db_user.backup_codes, body.totp_code)
        if backup_valid:
            db_user.backup_codes = remaining  # consume the used code
            db.commit()

    if not totp_valid and not backup_valid:
        log_audit_event(
            db=db, action="2FA_VERIFY_FAIL", success=False,
            user_id=db_user.id, ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            failure_reason="Invalid 2FA code",
        )
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    reset_failed_attempts(db=db, user=db_user)

    access_token = create_access_token({"sub": db_user.email})
    raw_refresh_token = create_refresh_token(
        db=db,
        user_id=db_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    log_audit_event(
        db=db, action="LOGIN", success=True,
        user_id=db_user.id, ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=15 * 60,
    )


@router.post("/2fa/disable", response_model=UserProfile)
def disable_2fa(
    body: TOTPDisableRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disables 2FA.  Requires the current password AND a valid OTP or backup code
    to prevent accidental or malicious deactivation.
    """
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Incorrect password")

    # Accept either OTP or backup code
    totp_valid = len(body.totp_code) == 6 and verify_totp_code(current_user.totp_secret, body.totp_code)
    backup_valid = False
    if not totp_valid and current_user.backup_codes:
        backup_valid, remaining = verify_backup_code(current_user.backup_codes, body.totp_code)
        if backup_valid:
            current_user.backup_codes = remaining

    if not totp_valid and not backup_valid:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    current_user.backup_codes = None
    db.commit()
    db.refresh(current_user)

    log_audit_event(
        db=db, action="2FA_DISABLED", success=True,
        user_id=current_user.id, ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return current_user


@router.post("/2fa/regenerate-backup-codes", response_model=BackupCodesResponse)
def regenerate_backup_codes(
    body: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerates backup codes for an account that already has 2FA enabled.
    Requires a valid OTP to confirm identity before issuing new codes.
    Old backup codes are invalidated immediately.
    """
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    if not verify_totp_code(current_user.totp_secret, body.totp_code):
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    plain_codes, hashed_codes = generate_backup_codes(8)
    current_user.backup_codes = hashed_codes
    db.commit()

    log_audit_event(
        db=db, action="2FA_BACKUP_CODES_REGENERATED", success=True,
        user_id=current_user.id,
    )

    return BackupCodesResponse(backup_codes=plain_codes)