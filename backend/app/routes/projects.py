from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectNote
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectNoteCreate, ProjectNoteUpdate, ProjectNoteResponse
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

# ========== PROJECT ENDPOINTS ==========

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    project = Project(
        user_id=current_user.id,
        title=project_data.title,
        description=project_data.description,
        color=project_data.color,
        icon=project_data.icon
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    note_count = 0
    
    return ProjectResponse(
        id=project.id,
        title=project.title,
        description=project.description,
        status=project.status,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at,
        updated_at=project.updated_at,
        archived_at=project.archived_at,
        completed_at=project.completed_at,
        note_count=note_count
    )

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    status_filter: Optional[str] = Query(None, regex="^(active|archived|completed)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's projects"""
    query = db.query(Project).filter(Project.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Project.status == status_filter)
    
    projects = query.order_by(Project.created_at.desc()).all()
    
    # Add note counts
    result = []
    for project in projects:
        note_count = db.query(ProjectNote).filter(
            ProjectNote.project_id == project.id
        ).count()
        
        result.append(ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description,
            status=project.status,
            color=project.color,
            icon=project.icon,
            created_at=project.created_at,
            updated_at=project.updated_at,
            archived_at=project.archived_at,
            completed_at=project.completed_at,
            note_count=note_count
        ))
    
    return result

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    note_count = db.query(ProjectNote).filter(
        ProjectNote.project_id == project.id
    ).count()
    
    return ProjectResponse(
        id=project.id,
        title=project.title,
        description=project.description,
        status=project.status,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at,
        updated_at=project.updated_at,
        archived_at=project.archived_at,
        completed_at=project.completed_at,
        note_count=note_count
    )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    if update_data.title is not None:
        project.title = update_data.title
    if update_data.description is not None:
        project.description = update_data.description
    if update_data.status is not None:
        project.status = update_data.status
        if update_data.status == "archived":
            project.archived_at = func.now()
        elif update_data.status == "completed":
            project.completed_at = func.now()
    if update_data.color is not None:
        project.color = update_data.color
    if update_data.icon is not None:
        project.icon = update_data.icon
    
    db.commit()
    db.refresh(project)
    
    note_count = db.query(ProjectNote).filter(
        ProjectNote.project_id == project.id
    ).count()
    
    return ProjectResponse(
        id=project.id,
        title=project.title,
        description=project.description,
        status=project.status,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at,
        updated_at=project.updated_at,
        archived_at=project.archived_at,
        completed_at=project.completed_at,
        note_count=note_count
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project and all its notes"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

# ========== PROJECT NOTES ENDPOINTS ==========

@router.post("/{project_id}/notes", response_model=ProjectNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_project_note(
    project_id: str,
    note_data: ProjectNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add note to project"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    note = ProjectNote(
        project_id=project_id,
        user_id=current_user.id,
        title=note_data.title,
        content=note_data.content,
        note_type=note_data.note_type,
        due_date=note_data.due_date,
        priority=note_data.priority
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return note

@router.get("/{project_id}/notes", response_model=List[ProjectNoteResponse])
async def list_project_notes(
    project_id: str,
    note_type: Optional[str] = Query(None, regex="^(note|idea|task|link)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List notes for a project"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    query = db.query(ProjectNote).filter(ProjectNote.project_id == project_id)
    
    if note_type:
        query = query.filter(ProjectNote.note_type == note_type)
    
    notes = query.order_by(ProjectNote.created_at.desc()).all()
    return notes

@router.put("/{project_id}/notes/{note_id}", response_model=ProjectNoteResponse)
async def update_project_note(
    project_id: str,
    note_id: str,
    update_data: ProjectNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project note"""
    note = db.query(ProjectNote).filter(
        ProjectNote.id == note_id,
        ProjectNote.project_id == project_id,
        ProjectNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Update fields
    if update_data.title is not None:
        note.title = update_data.title
    if update_data.content is not None:
        note.content = update_data.content
    if update_data.note_type is not None:
        note.note_type = update_data.note_type
    if update_data.completed is not None:
        note.completed = update_data.completed
        if update_data.completed:
            note.completed_at = func.now()
        else:
            note.completed_at = None
    if update_data.due_date is not None:
        note.due_date = update_data.due_date
    if update_data.priority is not None:
        note.priority = update_data.priority
    
    db.commit()
    db.refresh(note)
    
    return note

@router.delete("/{project_id}/notes/{note_id}")
async def delete_project_note(
    project_id: str,
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project note"""
    note = db.query(ProjectNote).filter(
        ProjectNote.id == note_id,
        ProjectNote.project_id == project_id,
        ProjectNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(note)
    db.commit()
    
    return {"message": "Note deleted successfully"}