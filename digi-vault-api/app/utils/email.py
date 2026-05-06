import os
from pathlib import Path
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv
import logging

# Load .env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "DigiVault"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_email_otp(to_email: str, code: str):
    """
    Sends an Email OTP to the specified user.
    """
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">DigiVault Two-Factor Authentication</h2>
        <p style="color: #555; font-size: 16px;">Hello,</p>
        <p style="color: #555; font-size: 16px;">Here is your One-Time Password (OTP) for logging into your account. This code is valid for 10 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; background: #fff; padding: 15px 30px; border-radius: 8px; border: 1px solid #ddd;">{code}</span>
        </div>
        <p style="color: #555; font-size: 14px;">If you did not request this, please ignore this email or secure your account.</p>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">&copy; 2026 DigiVault. All rights reserved.</p>
    </div>
    """

    message = MessageSchema(
        subject="Your DigiVault Login Code",
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info(f"OTP email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        # Not raising an exception here to avoid breaking the flow if email fails, 
        # but in production you might want to handle it.

async def send_verification_email(to_email: str, token: str):
    """
    Sends an email verification link to the user.
    """
    # Assuming frontend is at http://localhost:5173
    verify_url = f"http://localhost:5173/verify-email?token={token}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
        <p style="color: #555; font-size: 16px;">Hello,</p>
        <p style="color: #555; font-size: 16px;">Please click the button below to verify your email address for your DigiVault account. This link is valid for 24 hours.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p style="color: #555; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">{verify_url}</p>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">&copy; 2026 DigiVault. All rights reserved.</p>
    </div>
    """

    message = MessageSchema(
        subject="Verify your DigiVault email",
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info(f"Verification email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")

async def send_password_reset_email(to_email: str, token: str):
    """
    Sends a password reset link to the user.
    """
    reset_url = f"http://localhost:5173/reset-password?token={token}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
        <p style="color: #555; font-size: 16px;">Hello,</p>
        <p style="color: #555; font-size: 16px;">We received a request to reset your DigiVault password. Click the button below to set a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #555; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">{reset_url}</p>
        <p style="color: #555; font-size: 14px; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">&copy; 2026 DigiVault. All rights reserved.</p>
    </div>
    """

    message = MessageSchema(
        subject="Reset your DigiVault password",
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info(f"Password reset email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
