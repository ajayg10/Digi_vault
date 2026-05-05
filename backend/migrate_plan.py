"""Add 'plan' column to users table if it doesn't already exist."""
from app.core.database import engine
from sqlalchemy import text, inspect

insp = inspect(engine)
columns = [c["name"] for c in insp.get_columns("users")]

if "plan" not in columns:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'free'"))
        conn.commit()
    print("Column 'plan' added to users table.")
else:
    print("Column 'plan' already exists.")
