from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ============ Auth Schemas ============
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ============ User Schemas ============
class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    total_files: int = 0
    total_folders: int = 0
    total_storage: int = 0  # in bytes

    class Config:
        from_attributes = True


# ============ File Schemas ============
class FileOut(BaseModel):
    id: int
    name: str
    original_name: str
    file_type: str
    file_size: int
    folder_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FileRename(BaseModel):
    new_name: str


class ShareLinkOut(BaseModel):
    token: str
    url: str
    expires_at: Optional[datetime] = None


class SharedFileOut(BaseModel):
    name: str
    original_name: str
    file_type: str
    file_size: int
    created_at: datetime


class FileTrashOut(BaseModel):
    id: int
    name: str
    original_name: str
    file_type: str
    file_size: int
    folder_id: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Folder Schemas ============
class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None


class FolderOut(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FolderRename(BaseModel):
    new_name: str


# ============ Dashboard Schemas ============
class StorageCategory(BaseModel):
    category: str
    bytes: int
    count: int


class ActivityOut(BaseModel):
    id: int
    action: str
    item_name: str
    item_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_files: int
    total_folders: int
    total_storage: int  # in bytes
    recent_files: list[FileOut] = []
    storage_by_type: list[StorageCategory] = []
    activities: list[ActivityOut] = []


# ============ Common Schemas ============
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
