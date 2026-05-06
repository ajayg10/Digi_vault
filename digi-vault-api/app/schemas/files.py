from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FileUploadResponse(BaseModel):
    id: str
    original_filename: str
    size_bytes: int
    mime_type: Optional[str]
    created_at: datetime
    storage_path: str
    
    class Config:
        from_attributes = True

class FileMetadata(BaseModel):
    id: str
    original_filename: str
    size_bytes: int
    mime_type: Optional[str]
    tags: List[str]
    description: Optional[str]
    is_favorite: bool
    folder_id: Optional[str]
    download_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_accessed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class FileUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    is_favorite: Optional[bool] = None
    folder_id: Optional[str] = None

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_folder_id: Optional[str] = None
    color: Optional[str] = Field(default="#6366f1", pattern="^#[0-9A-Fa-f]{6}$")

class FolderResponse(BaseModel):
    id: str
    name: str
    color: str
    parent_folder_id: Optional[str]
    created_at: datetime
    file_count: int = 0
    
    class Config:
        from_attributes = True

class StorageQuotaResponse(BaseModel):
    total_quota_bytes: int
    used_bytes: int
    available_bytes: int
    file_count: int
    usage_percentage: float
    
    @staticmethod
    def from_quota(quota) -> 'StorageQuotaResponse':
        available = quota.total_quota_bytes - quota.used_bytes
        percentage = (quota.used_bytes / quota.total_quota_bytes) * 100 if quota.total_quota_bytes > 0 else 0
        return StorageQuotaResponse(
            total_quota_bytes=quota.total_quota_bytes,
            used_bytes=quota.used_bytes,
            available_bytes=available,
            file_count=quota.file_count,
            usage_percentage=round(percentage, 2)
        )