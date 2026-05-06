from app.core.database import Base

def upgrade(engine):
    """Add new tables and columns"""
    Base.metadata.create_all(bind=engine)