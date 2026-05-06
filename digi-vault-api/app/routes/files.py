from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import mimetypes

from app.core.database import get_db
from app.core.storage import storage
from app.models.user import User
from app.models.file import File, Folder, UserStorageQuota
from app.schemas.files import (
    FileUploadResponse, FileMetadata, FileUpdateRequest,
    FolderCreate, FolderResponse, StorageQuotaResponse
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/files", tags=["Files"])

# Plan-aware storage limits
PLAN_STORAGE_LIMITS = {
    "free": 5 * 1024 * 1024 * 1024,      # 5 GB
    "pro": 25 * 1024 * 1024 * 1024,      # 25 GB
}

PLAN_FILE_LIMITS = {
    "free": 50,
    "pro": -1,   # unlimited
}

# Helper functions
def get_or_create_quota(db: Session, user_id: str) -> UserStorageQuota:
    quota = db.query(UserStorageQuota).filter(
        UserStorageQuota.user_id == user_id
    ).first()
    
    if not quota:
        # Look up user's plan to set correct quota
        user = db.query(User).filter(User.id == user_id).first()
        plan = user.plan if user and user.plan else "free"
        quota = UserStorageQuota(
            user_id=user_id,
            total_quota_bytes=PLAN_STORAGE_LIMITS.get(plan, PLAN_STORAGE_LIMITS["free"]),
        )
        db.add(quota)
        db.commit()
        db.refresh(quota)
    
    return quota

def check_quota(quota: UserStorageQuota, file_size: int, user_plan: str = "free"):
    # Check storage limit
    if quota.used_bytes + file_size > quota.total_quota_bytes:
        available_mb = (quota.total_quota_bytes - quota.used_bytes) / (1024 * 1024)
        required_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Insufficient storage. Available: {available_mb:.2f}MB, Required: {required_mb:.2f}MB. Upgrade to Pro for 25 GB storage."
        )
    # Check file count limit
    file_limit = PLAN_FILE_LIMITS.get(user_plan, 50)
    if file_limit != -1 and quota.file_count >= file_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"File limit reached ({file_limit} files). Upgrade to Pro for unlimited files."
        )

def update_quota(db: Session, quota: UserStorageQuota, size_delta: int, file_count_delta: int = 0):
    quota.used_bytes += size_delta
    quota.file_count += file_count_delta
    db.commit()

# ========== STATIC PATH ROUTES (must be before /{file_id}) ==========

@router.get("/search", response_model=List[FileMetadata])
async def search_files(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search files by name, tags, or description"""
    search_term = f"%{q}%"
    
    files = db.query(File).filter(
        File.user_id == current_user.id,
        File.deleted_at.is_(None),
        or_(
            File.original_filename.ilike(search_term),
            File.description.ilike(search_term),
        )
    ).order_by(File.created_at.desc()).all()
    
    return files

@router.get("/trash/list", response_model=List[FileMetadata])
async def list_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List deleted files (trash)"""
    files = db.query(File).filter(
        File.user_id == current_user.id,
        File.deleted_at.isnot(None)
    ).order_by(File.deleted_at.desc()).all()
    
    return files

@router.get("/quota/status", response_model=StorageQuotaResponse)
async def get_storage_quota(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's storage quota status"""
    quota = get_or_create_quota(db, current_user.id)
    return StorageQuotaResponse.from_quota(quota)

# ========== FOLDER ENDPOINTS (static paths before /{file_id}) ==========

@router.post("/folders", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new folder"""
    
    # Validate parent folder if specified
    if folder_data.parent_folder_id:
        parent = db.query(Folder).filter(
            Folder.id == folder_data.parent_folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
    
    folder = Folder(
        user_id=current_user.id,
        name=folder_data.name,
        parent_folder_id=folder_data.parent_folder_id,
        color=folder_data.color
    )
    
    db.add(folder)
    db.commit()
    db.refresh(folder)
    
    # Count files in folder
    file_count = db.query(File).filter(
        File.folder_id == folder.id,
        File.deleted_at.is_(None)
    ).count()
    
    response = FolderResponse(
        id=folder.id,
        name=folder.name,
        color=folder.color,
        parent_folder_id=folder.parent_folder_id,
        created_at=folder.created_at,
        file_count=file_count
    )
    
    return response

@router.get("/folders", response_model=List[FolderResponse])
async def list_folders(
    parent_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's folders"""
    query = db.query(Folder).filter(Folder.user_id == current_user.id)
    
    if parent_id:
        query = query.filter(Folder.parent_folder_id == parent_id)
    else:
        query = query.filter(Folder.parent_folder_id.is_(None))
    
    folders = query.order_by(Folder.created_at.desc()).all()
    
    # Add file counts
    result = []
    for folder in folders:
        file_count = db.query(File).filter(
            File.folder_id == folder.id,
            File.deleted_at.is_(None)
        ).count()
        
        result.append(FolderResponse(
            id=folder.id,
            name=folder.name,
            color=folder.color,
            parent_folder_id=folder.parent_folder_id,
            created_at=folder.created_at,
            file_count=file_count
        ))
    
    return result

@router.put("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: str,
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update folder"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    folder.name = folder_data.name
    folder.color = folder_data.color
    
    if folder_data.parent_folder_id:
        # Prevent circular references
        if folder_data.parent_folder_id == folder_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Folder cannot be its own parent"
            )
        
        parent = db.query(Folder).filter(
            Folder.id == folder_data.parent_folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
        folder.parent_folder_id = folder_data.parent_folder_id
    
    db.commit()
    db.refresh(folder)
    
    file_count = db.query(File).filter(
        File.folder_id == folder.id,
        File.deleted_at.is_(None)
    ).count()
    
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        color=folder.color,
        parent_folder_id=folder.parent_folder_id,
        created_at=folder.created_at,
        file_count=file_count
    )

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete folder (moves files to root)"""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Move files to root
    db.query(File).filter(File.folder_id == folder_id).update({"folder_id": None})
    
    # Delete folder
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder deleted successfully"}

# ========== FILE ENDPOINTS ==========

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file"""
    
    # Read file data
    file_data = await file.read()
    file_size = len(file_data)
    
    # Check quota
    quota = get_or_create_quota(db, current_user.id)
    check_quota(quota, file_size, current_user.plan or "free")
    
    # Validate folder if specified
    if folder_id:
        folder = db.query(Folder).filter(
            Folder.id == folder_id,
            Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
    
    # Store file
    storage_info = storage.save_file(current_user.id, file_data, file.filename)
    
    # Detect MIME type
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(',')] if tags else []
    
    # Create file record
    file_record = File(
        user_id=current_user.id,
        folder_id=folder_id,
        filename=storage_info["filename"],
        original_filename=file.filename,
        mime_type=mime_type,
        size_bytes=file_size,
        storage_provider="local",
        storage_path=storage_info["storage_path"],
        storage_key=storage_info["storage_key"],
        tags=tag_list,
        description=description
    )
    
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    
    # Update quota
    update_quota(db, quota, file_size, file_count_delta=1)
    
    return file_record

@router.get("/", response_model=List[FileMetadata])
async def list_files(
    folder_id: Optional[str] = Query(None),
    favorites_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's files"""
    query = db.query(File).filter(
        File.user_id == current_user.id,
        File.deleted_at.is_(None)
    )
    
    if folder_id:
        query = query.filter(File.folder_id == folder_id)
    
    if favorites_only:
        query = query.filter(File.is_favorite == True)
    
    files = query.order_by(File.created_at.desc()).all()
    return files

# ========== DYNAMIC PATH ROUTES (/{file_id} must be LAST) ==========

@router.get("/{file_id}", response_model=FileMetadata)
async def get_file_metadata(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file metadata"""
    file_record = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id,
        File.deleted_at.is_(None)
    ).first()
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file_record

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download file"""
    from fastapi.responses import StreamingResponse
    import io
    
    file_record = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id,
        File.deleted_at.is_(None)
    ).first()
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Read file from storage
    file_data = storage.get_file(file_record.storage_path)
    
    # Update tracking
    file_record.download_count += 1
    file_record.last_accessed_at = func.now()
    db.commit()
    
    return StreamingResponse(
        io.BytesIO(file_data),
        media_type=file_record.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file_record.original_filename}"'
        }
    )

@router.put("/{file_id}", response_model=FileMetadata)
async def update_file_metadata(
    file_id: str,
    update_data: FileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update file metadata (tags, description, favorite, folder)"""
    file_record = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id,
        File.deleted_at.is_(None)
    ).first()
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Update fields
    if update_data.tags is not None:
        file_record.tags = update_data.tags
    if update_data.description is not None:
        file_record.description = update_data.description
    if update_data.is_favorite is not None:
        file_record.is_favorite = update_data.is_favorite
    if update_data.folder_id is not None:
        # Validate folder
        if update_data.folder_id:
            folder = db.query(Folder).filter(
                Folder.id == update_data.folder_id,
                Folder.user_id == current_user.id
            ).first()
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )
        file_record.folder_id = update_data.folder_id
    
    db.commit()
    db.refresh(file_record)
    return file_record

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    permanent: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file (soft delete by default)"""
    file_record = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if permanent:
        # Delete from storage
        storage.delete_file(file_record.storage_path)
        
        # Update quota
        quota = get_or_create_quota(db, current_user.id)
        update_quota(db, quota, -file_record.size_bytes, file_count_delta=-1)
        
        # Delete from DB
        db.delete(file_record)
    else:
        # Soft delete
        file_record.deleted_at = func.now()
    
    db.commit()
    return {"message": "File deleted successfully"}

@router.post("/{file_id}/restore")
async def restore_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore file from trash"""
    file_record = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id,
        File.deleted_at.isnot(None)
    ).first()
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in trash"
        )
    
    file_record.deleted_at = None
    db.commit()
    
    return {"message": "File restored successfully"}