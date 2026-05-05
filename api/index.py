import sys
import os

# Add the project root to path so backend imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.main import app
