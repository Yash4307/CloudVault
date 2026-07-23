from sqlalchemy import func
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from typing import Optional, List
from datetime import datetime, timedelta
import os
import secrets
from urllib.parse import quote
from pydantic import BaseModel

from database import engine, get_db, Base
from models import User, File as FileModel, Folder, SharedLink, Activity
from schemas import (
    UserRegister, UserLogin, DeleteAccountRequest, Token, UserOut, UserProfile,
    FileOut, FileRename, FileTrashOut, FolderCreate, FolderOut, FolderRename,
    DashboardStats, MessageResponse, ShareLinkOut, SharedFileOut
)
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user
)
from storage import upload_file, download_file, delete_file, ensure_bucket_exists

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="CloudVault API",
    description="Secure Cloud Storage Platform API",
    version="1.0.0"
)

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_URL", "")).split(",")
    if origin.strip()
]
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(default_origins + allowed_origins)),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ============ Startup ============
@app.on_event("startup")
async def startup_event():
    ensure_bucket_exists()
    print("CloudVault API started successfully")


def log_activity(db: Session, user_id: int, action: str, item_name: str, item_type: str, file_id: int = None, folder_id: int = None):
    db.add(Activity(
        action=action,
        item_name=item_name,
        item_type=item_type,
        user_id=user_id,
        file_id=file_id,
        folder_id=folder_id
    ))


def file_category(file_type: str) -> str:
    if not file_type:
        return "Others"
    if file_type.startswith("image/"):
        return "Images"
    if file_type.startswith("video/"):
        return "Videos"
    if (
        file_type.startswith("text/")
        or file_type == "application/pdf"
        or "document" in file_type
        or "word" in file_type
        or "presentation" in file_type
        or "powerpoint" in file_type
        or "spreadsheet" in file_type
        or "excel" in file_type
    ):
        return "Documents"
    return "Others"


def file_download_response(file_record: FileModel, file_data: bytes) -> Response:
    filename = file_record.original_name or file_record.name
    encoded_filename = quote(filename)
    return Response(
        content=file_data,
        media_type=file_record.file_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )


# ============ Auth Routes ============
@app.post("/register", response_model=Token)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"user_id": new_user.id})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    access_token = create_access_token(data={"user_id": db_user.id})
    return Token(access_token=access_token, token_type="bearer")


# ============ User Routes ============
@app.get("/profile", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ✅ FIXED: Exclude deleted files
    total_files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).count()
    
    total_folders = db.query(Folder).filter(Folder.user_id == current_user.id).count()
    
    # ✅ FIXED: Exclude deleted files from storage calculation
    files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).all()
    total_storage = sum(f.file_size for f in files)
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        total_files=total_files,
        total_folders=total_folders,
        total_storage=total_storage
    )


# ============ File Routes ============
@app.post("/files/upload", response_model=FileOut)
async def upload_file_route(
    file: UploadFile = File(...),
    folder_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_data = await file.read()
    if len(file_data) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 50MB limit")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = f"{current_user.id}/{timestamp}_{file.filename}"
    
    try:
        upload_file(file_data, file_path, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload failed: {str(e)}")
    
    new_file = FileModel(
        name=file.filename,
        original_name=file.filename,
        file_path=file_path,
        file_type=file.content_type or "application/octet-stream",
        file_size=len(file_data),
        user_id=current_user.id,
        folder_id=folder_id
    )
    db.add(new_file)
    db.flush()
    log_activity(db, current_user.id, "uploaded", new_file.name, "file", file_id=new_file.id)
    db.commit()
    db.refresh(new_file)
    return new_file


@app.get("/files", response_model=List[FileOut])
def list_files(
    folder_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    )
    
    if folder_id is not None:
        query = query.filter(FileModel.folder_id == folder_id)
    if search:
        query = query.filter(FileModel.name.ilike(f"%{search}%"))
    
    sort_column = getattr(FileModel, sort_by, FileModel.created_at)
    if order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    
    return query.all()


@app.get("/files/trash", response_model=List[FileTrashOut])
def get_trash_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all soft-deleted files."""
    files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == True
    ).order_by(desc(FileModel.deleted_at)).all()
    return files


@app.post("/files/{file_id}/share", response_model=ShareLinkOut)
def create_share_link(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    shared_link = SharedLink(
        token=secrets.token_urlsafe(18),
        file_id=file_record.id,
        user_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(shared_link)
    log_activity(db, current_user.id, "shared", file_record.name, "file", file_id=file_record.id)
    db.commit()
    db.refresh(shared_link)

    frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
    return ShareLinkOut(
        token=shared_link.token,
        url=f"{frontend_url}/share/{shared_link.token}",
        expires_at=shared_link.expires_at
    )


@app.get("/files/{file_id}", response_model=FileOut)
def get_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file_record


@app.get("/files/{file_id}/download")
def download_file_route(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    try:
        file_data = download_file(file_record.file_path)
        return file_download_response(file_record, file_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download failed: {str(e)}")


@app.put("/files/{file_id}/rename", response_model=FileOut)
def rename_file_route(file_id: int, rename_data: FileRename, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    file_record.name = rename_data.new_name
    file_record.original_name = rename_data.new_name
    db.commit()
    db.refresh(file_record)
    return file_record


@app.delete("/files/{file_id}", response_model=MessageResponse)
def soft_delete_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    file_record.is_deleted = True
    file_record.deleted_at = func.now()
    log_activity(db, current_user.id, "deleted", file_record.name, "file", file_id=file_record.id)
    db.commit()
    return MessageResponse(message="File moved to recycle bin")


@app.post("/files/{file_id}/restore", response_model=FileOut)
def restore_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == True
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found in trash")
    
    file_record.is_deleted = False
    file_record.deleted_at = None
    log_activity(db, current_user.id, "restored", file_record.name, "file", file_id=file_record.id)
    db.commit()
    db.refresh(file_record)
    return file_record


@app.delete("/files/{file_id}/permanent", response_model=MessageResponse)
def permanent_delete_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == True
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found in trash")
    
    try:
        delete_file(file_record.file_path)
    except Exception as e:
        print(f"Warning: Could not delete from storage: {str(e)}")
    
    db.query(SharedLink).filter(SharedLink.file_id == file_record.id).delete(synchronize_session=False)
    db.query(Activity).filter(Activity.file_id == file_record.id).update(
        {Activity.file_id: None},
        synchronize_session=False
    )
    log_activity(db, current_user.id, "permanently deleted", file_record.name, "file")
    db.delete(file_record)
    db.commit()
    return MessageResponse(message="File permanently deleted")


# ============ Folder Routes ============
@app.post("/folders", response_model=FolderOut)
def create_folder(folder: FolderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if folder.parent_id:
        parent_folder = db.query(Folder).filter(
            Folder.id == folder.parent_id,
            Folder.user_id == current_user.id
        ).first()
        if not parent_folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found")
    
    new_folder = Folder(name=folder.name, parent_id=folder.parent_id, user_id=current_user.id)
    db.add(new_folder)
    db.flush()
    log_activity(db, current_user.id, "created", new_folder.name, "folder", folder_id=new_folder.id)
    db.commit()
    db.refresh(new_folder)
    return new_folder


@app.get("/folders", response_model=List[FolderOut])
def list_folders(
    parent_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Folder).filter(Folder.user_id == current_user.id)
    query = query.filter(Folder.parent_id == parent_id)
    if search:
        query = query.filter(Folder.name.ilike(f"%{search}%"))
    return query.all()


@app.get("/folders/{folder_id}", response_model=FolderOut)
def get_folder(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


@app.put("/folders/{folder_id}/rename", response_model=FolderOut)
def rename_folder(folder_id: int, rename_data: FolderRename, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    folder.name = rename_data.new_name
    db.commit()
    db.refresh(folder)
    return folder


@app.delete("/folders/{folder_id}", response_model=MessageResponse)
def delete_folder(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    
    files = db.query(FileModel).filter(
        FileModel.folder_id == folder_id,
        FileModel.user_id == current_user.id
    ).all()
    for file in files:
        try:
            delete_file(file.file_path)
        except Exception as e:
            print(f"Warning: Could not delete file from storage: {str(e)}")
    
    log_activity(db, current_user.id, "deleted", folder.name, "folder")
    db.delete(folder)
    db.commit()
    return MessageResponse(message="Folder deleted successfully")


# ============ Dashboard Routes ============
@app.get("/dashboard", response_model=DashboardStats)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    category_map = {
        "Documents": {"category": "Documents", "bytes": 0, "count": 0},
        "Images": {"category": "Images", "bytes": 0, "count": 0},
        "Videos": {"category": "Videos", "bytes": 0, "count": 0},
        "Others": {"category": "Others", "bytes": 0, "count": 0},
    }
    # ✅ FIXED: Exclude deleted files
    total_files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).count()
    
    total_folders = db.query(Folder).filter(Folder.user_id == current_user.id).count()
    
    # ✅ FIXED: Exclude deleted files from storage
    files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).all()
    total_storage = sum(f.file_size for f in files)
    
    # ✅ FIXED: Exclude deleted files from recent
    for file_record in files:
        category = file_category(file_record.file_type)
        category_map[category]["bytes"] += file_record.file_size
        category_map[category]["count"] += 1

    recent_files = db.query(FileModel).filter(
        FileModel.user_id == current_user.id,
        FileModel.is_deleted == False
    ).order_by(desc(FileModel.created_at)).limit(5).all()
    activities = db.query(Activity).filter(
        Activity.user_id == current_user.id
    ).order_by(desc(Activity.created_at)).limit(8).all()
    
    return DashboardStats(
        total_files=total_files,
        total_folders=total_folders,
        total_storage=total_storage,
        recent_files=recent_files,
        storage_by_type=list(category_map.values()),
        activities=activities
    )


# ============ Public Share Routes ============
@app.get("/share/{token}", response_model=SharedFileOut)
def get_shared_file(token: str, db: Session = Depends(get_db)):
    shared_link = db.query(SharedLink).filter(SharedLink.token == token).first()
    if not shared_link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared file not found")

    now = datetime.now(shared_link.expires_at.tzinfo) if shared_link.expires_at and shared_link.expires_at.tzinfo else datetime.utcnow()
    if shared_link.expires_at and shared_link.expires_at < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Share link has expired")

    file_record = db.query(FileModel).filter(
        FileModel.id == shared_link.file_id,
        FileModel.is_deleted == False
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared file not found")
    return file_record


@app.get("/share/{token}/download")
def download_shared_file(token: str, db: Session = Depends(get_db)):
    shared_link = db.query(SharedLink).filter(SharedLink.token == token).first()
    if not shared_link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared file not found")

    now = datetime.now(shared_link.expires_at.tzinfo) if shared_link.expires_at and shared_link.expires_at.tzinfo else datetime.utcnow()
    if shared_link.expires_at and shared_link.expires_at < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Share link has expired")

    file_record = db.query(FileModel).filter(
        FileModel.id == shared_link.file_id,
        FileModel.is_deleted == False
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared file not found")

    try:
        file_data = download_file(file_record.file_path)
        return file_download_response(file_record, file_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download failed: {str(e)}")


# ============ Password Change ============
class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@app.put("/profile/change-password", response_model=MessageResponse)
def change_password(data: ChangePassword, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return MessageResponse(message="Password changed successfully")


@app.delete("/profile/delete-account", response_model=MessageResponse)
def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if data.username != user.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username does not match")

    user_files = db.query(FileModel).filter(FileModel.user_id == user.id).all()
    failed_paths = []
    for file_record in user_files:
        try:
            delete_file(file_record.file_path)
        except Exception as exc:
            failed_paths.append(file_record.file_path)
            print(f"Account deletion storage cleanup failed for {file_record.file_path}: {exc}")

    if failed_paths:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed while removing stored files"
        )

    try:
        db.query(SharedLink).filter(SharedLink.user_id == user.id).delete(synchronize_session=False)
        db.query(Activity).filter(Activity.user_id == user.id).delete(synchronize_session=False)
        db.query(FileModel).filter(FileModel.user_id == user.id).delete(synchronize_session=False)
        db.query(Folder).filter(Folder.user_id == user.id).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Account deletion database cleanup failed for user {user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed while removing account data"
        )

    return MessageResponse(message="Account permanently deleted")


# ============ Health Check ============
@app.get("/")
def root():
    return {"message": "CloudVault API is running", "version": "1.0.0"}
