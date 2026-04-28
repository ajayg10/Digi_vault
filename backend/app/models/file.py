from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Folder(Base):
    __tablename__ = "folders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_folder_id = Column(String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    color = Column(String(7), default="#6366f1")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    files = relationship("File", back_populates="folder", cascade="all, delete-orphan")
    subfolders = relationship("Folder", backref="parent_folder", remote_side=[id])

class File(Base):
    __tablename__ = "files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(String, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # File metadata
    filename = Column(String(255), nullable=False)  # Stored filename (UUID-based)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(BigInteger, nullable=False)
    
    # Storage details
    storage_provider = Column(String(20), default="local")
    storage_path = Column(Text, nullable=False)
    storage_key = Column(Text, nullable=True)
    
    # Organization
    tags = Column(JSON, default=list)
    description = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False)
    
    # Tracking
    download_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    folder = relationship("Folder", back_populates="files")

class UserStorageQuota(Base):
    __tablename__ = "user_storage_quota"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    total_quota_bytes = Column(BigInteger, default=5 * 1024 * 1024 * 1024)  # 5 GB
    used_bytes = Column(BigInteger, default=0)
    file_count = Column(Integer, default=0)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())