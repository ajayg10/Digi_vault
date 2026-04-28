from sqlalchemy import create_engine
from app.core.database import Base
from app.models.user import User, RefreshToken, AuditLog

def upgrade(engine):
    """Add new tables and columns"""
    Base.metadata.create_all(bind=engine)