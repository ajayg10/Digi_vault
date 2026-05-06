"""Update existing free plan quotas to 5GB."""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE user_storage_quota SET total_quota_bytes = 5368709120 WHERE total_quota_bytes = 524288000"))
    conn.commit()
    print("Updated free plan storage quotas to 5GB.")
