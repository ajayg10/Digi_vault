from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(default="#6366f1", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|archived|completed)$")
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    color: str
    icon: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    archived_at: Optional[datetime]
    completed_at: Optional[datetime]
    note_count: int = 0
    
    class Config:
        from_attributes = True

class ProjectNoteCreate(BaseModel):
    title: Optional[str] = None
    content: str = Field(..., min_length=1)
    note_type: Optional[str] = Field(default="note", pattern="^(note|idea|task|link)$")
    due_date: Optional[date] = None
    priority: Optional[int] = Field(default=0, ge=0, le=3)

class ProjectNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    note_type: Optional[str] = Field(None, pattern="^(note|idea|task|link)$")
    completed: Optional[bool] = None
    due_date: Optional[date] = None
    priority: Optional[int] = Field(None, ge=0, le=3)

class ProjectNoteResponse(BaseModel):
    id: str
    project_id: str
    title: Optional[str]
    content: str
    note_type: str
    completed: bool
    completed_at: Optional[datetime]
    due_date: Optional[date]
    priority: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True