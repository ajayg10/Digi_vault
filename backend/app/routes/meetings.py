from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User
from app.models.meeting import Meeting
from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse
from app.routes.auth import get_current_user

from app.core.agora import agora_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])

@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new meeting"""
    meeting = Meeting(
        user_id=current_user.id,
        title=meeting_data.title,
        meeting_date=meeting_data.meeting_date,
        duration_minutes=meeting_data.duration_minutes,
        location=meeting_data.location,
        attendees=meeting_data.attendees,
        agenda=meeting_data.agenda,
        notes=meeting_data.notes,
        summary=meeting_data.summary,
        action_items=[item.dict() for item in meeting_data.action_items] if meeting_data.action_items else [],
        recording_url=meeting_data.recording_url,
        transcript_url=meeting_data.transcript_url
    )
    
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    return meeting

@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(
    upcoming: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List meetings"""
    query = db.query(Meeting).filter(Meeting.user_id == current_user.id)
    
    if upcoming is not None:
        now = datetime.utcnow()
        if upcoming:
            query = query.filter(Meeting.meeting_date >= now)
        else:
            query = query.filter(Meeting.meeting_date < now)
    
    meetings = query.order_by(Meeting.meeting_date.desc()).limit(limit).all()
    return meetings

@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meeting details"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    return meeting

@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    update_data: MeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update meeting"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    
    if "action_items" in update_dict and update_dict["action_items"]:
        update_dict["action_items"] = [item.dict() if hasattr(item, 'dict') else item for item in update_dict["action_items"]]
    
    for field, value in update_dict.items():
        setattr(meeting, field, value)
    
    db.commit()
    db.refresh(meeting)
    
    return meeting

@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete meeting"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    db.delete(meeting)
    db.commit()
    
    return {"message": "Meeting deleted successfully"}


@router.get("/{meeting_id}/call-token")
async def get_meeting_call_token(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Agora token for joining meeting call"""
    # Verify meeting exists and user has access
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    try:
        token_data = agora_service.generate_token_for_meeting(
            meeting_id=meeting_id,
            user_id=current_user.id
        )
        return token_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate call token: {str(e)}"
        )

@router.post("/{meeting_id}/recording")
async def save_meeting_recording(
    meeting_id: str,
    recording_data: dict,  # {recording_url: str, transcript_url?: str}
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save recording URL after call ends"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    if "recording_url" in recording_data:
        meeting.recording_url = recording_data["recording_url"]
    if "transcript_url" in recording_data:
        meeting.transcript_url = recording_data["transcript_url"]
    
    db.commit()
    db.refresh(meeting)
    
    return meeting   