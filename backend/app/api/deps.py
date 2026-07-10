import json
import os
import uuid
from typing import Optional

from fastapi import Depends, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import User
from app.repositories.base import UserRepository

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = UserRepository(db).get_by_id(int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    return UserRepository(db).get_by_id(int(payload["sub"]))


async def validate_image(file: UploadFile) -> bytes:
    settings = get_settings()
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP images are accepted")

    content = await file.read()
    max_bytes = settings.upload_max_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Image exceeds {settings.upload_max_mb}MB limit")

    try:
        img = Image.open(__import__("io").BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    return content


def save_image(content: bytes, user_id: int) -> str:
    settings = get_settings()
    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{user_id}_{uuid.uuid4().hex[:12]}.jpg"

    img = Image.open(__import__("io").BytesIO(content)).convert("RGB")
    img.thumbnail((1920, 1920))
    filepath = os.path.join(settings.upload_dir, filename)
    img.save(filepath, "JPEG", quality=85, optimize=True)
    return filepath
