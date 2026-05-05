from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProfile(BaseModel):
    id: str
    email: str
    email_verified: bool
    totp_enabled: bool
    email_2fa_enabled: bool
    plan: str = "free"
    created_at: datetime
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True  # Pydantic v2 (use orm_mode for v1)

# ─── 2FA Schemas ─────────────────────────────────────────────────────────────

class TOTPSetupResponse(BaseModel):
    """Returned when user requests to set up 2FA. Contains provisioning URI and QR-code data URL."""
    totp_uri: str          # otpauth:// URI for authenticator apps
    qr_code_base64: str    # base64-encoded PNG of QR code (data:image/png;base64,...)
    backup_codes: List[str]  # 8 one-time backup codes shown once

class TOTPVerifyRequest(BaseModel):
    """Used to confirm a 6-digit OTP (activates 2FA or verifies login)."""
    totp_code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')

class TOTPDisableRequest(BaseModel):
    """Requires current password + OTP (or backup code) to disable 2FA."""
    password: str
    totp_code: str = Field(..., min_length=6, max_length=8)  # 6-digit OTP or 8-char backup

class PreAuthTokenResponse(BaseModel):
    """Returned by /login when the account has 2FA enabled.
    The frontend must POST this token + the OTP to /auth/2fa/verify-login."""
    requires_2fa: bool = True
    pre_auth_token: str   # short-lived JWT (5 min) scoped to 2fa-pending
    method: str = "totp"  # "totp", "email", or "both"
    token_type: str = "bearer"

class TOTPLoginVerifyRequest(BaseModel):
    """Used to complete login when 2FA is required."""
    pre_auth_token: str
    totp_code: str = Field(..., min_length=6, max_length=8)  # OTP or backup code

class BackupCodesResponse(BaseModel):
    """Returned when backup codes are regenerated."""
    backup_codes: List[str]

# ─── Password Reset Schemas ──────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, description="New password must be at least 8 characters")