from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ActionItem(BaseModel):
    task: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_date: datetime
    duration_minutes: Optional[int] = Field(None, ge=1)
    location: Optional[str] = None
    attendees: Optional[List[str]] = []
    agenda: Optional[str] = None
    notes: Optional[str] = None
    summary: Optional[str] = None
    action_items: Optional[List[ActionItem]] = []
    recording_url: Optional[str] = None
    transcript_url: Optional[str] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    meeting_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    summary: Optional[str] = None
    action_items: Optional[List[ActionItem]] = None
    recording_url: Optional[str] = None
    transcript_url: Optional[str] = None

class MeetingResponse(BaseModel):
    id: str
    title: str
    meeting_date: datetime
    duration_minutes: Optional[int]
    location: Optional[str]
    attendees: List[str]
    agenda: Optional[str]
    notes: Optional[str]
    summary: Optional[str]
    action_items: Optional[List[Dict[str, Any]]]
    recording_url: Optional[str]
    transcript_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True