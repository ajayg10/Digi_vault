from sqlalchemy import Column, String, Integer, DateTime, ARRAY, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Meeting metadata
    title = Column(String(255), nullable=False)
    meeting_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    location = Column(String(255), nullable=True)  # Physical or virtual (Zoom link)
    attendees = Column(JSON, default=[])
    
    # Content
    agenda = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    action_items = Column(JSON, nullable=True)  # [{"task": "...", "assignee": "...", "due": "..."}]
    
    # Attachments
    recording_url = Column(Text, nullable=True)
    transcript_url = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())