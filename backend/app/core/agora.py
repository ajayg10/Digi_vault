import os
import time
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load .env from the backend root (two levels up from this file)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

try:
    from agora_token_builder import RtcTokenBuilder
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False


class AgoraService:
    """Generate Agora RTC tokens for video/audio calls"""
    
    def __init__(self):
        if not AGORA_AVAILABLE:
            raise RuntimeError(
                "agora_token_builder is not installed. "
                "Run: pip install agora-token-builder"
            )
        self.app_id = os.getenv("AGORA_APP_ID")
        self.app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
        
        if not self.app_id or not self.app_certificate:
            raise ValueError(
                "AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in backend/.env"
            )
    
    def generate_rtc_token(
        self,
        channel_name: str,
        uid: int = 0,
        role: int = 1,  # 1 = host, 2 = audience
        expiration_seconds: int = 3600  # 1 hour default
    ) -> dict:
        """
        Generate Agora RTC token for video/audio call
        
        Args:
            channel_name: Unique channel ID (use meeting_id)
            uid: User ID (0 = auto-assign)
            role: 1 for host (can publish), 2 for audience (subscribe only)
            expiration_seconds: Token validity duration
            
        Returns:
            dict with token, channel_name, uid, app_id, expiration
        """
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_seconds
        
        token = RtcTokenBuilder.buildTokenWithUid(
            self.app_id,
            self.app_certificate,
            channel_name,
            uid,
            role,
            privilege_expired_ts
        )
        
        return {
            "token": token,
            "channel_name": channel_name,
            "uid": uid,
            "app_id": self.app_id,
            "expiration_time": privilege_expired_ts,
            "expires_in_seconds": expiration_seconds
        }
    
    def generate_token_for_meeting(self, meeting_id: str, user_id: str) -> dict:
        """
        Generate token for a specific meeting.
        Uses meeting_id as channel name and hashed user_id as uid.
        """
        # Convert user_id to integer uid (Agora requires int)
        uid = abs(hash(user_id)) % (10 ** 8)
        
        return self.generate_rtc_token(
            channel_name=meeting_id,
            uid=uid,
            role=1,  # All users are hosts (can publish)
            expiration_seconds=7200  # 2 hours for meetings
        )

# Initialize service
agora_service = AgoraService()