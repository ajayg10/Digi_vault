import os
import uuid

STORAGE_DIR = "storage_data"

class LocalStorage:
    def __init__(self):
        os.makedirs(STORAGE_DIR, exist_ok=True)
        
    def save_file(self, user_id, file_data: bytes, original_filename: str) -> dict:
        storage_key = f"{user_id}/{uuid.uuid4()}"
        filename = f"{uuid.uuid4()}_{original_filename}"
        storage_path = os.path.join(STORAGE_DIR, filename)
        
        with open(storage_path, "wb") as f:
            f.write(file_data)
            
        return {
            "filename": filename,
            "storage_path": storage_path,
            "storage_key": storage_key
        }
        
    def get_file(self, storage_path: str) -> bytes:
        if not os.path.exists(storage_path):
            raise FileNotFoundError("File not found")
        with open(storage_path, "rb") as f:
            return f.read()
            
    def delete_file(self, storage_path: str) -> bool:
        if os.path.exists(storage_path):
            os.remove(storage_path)
            return True
        return False

storage = LocalStorage()
