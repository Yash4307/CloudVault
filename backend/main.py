from sqlalchemy import func
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from typing import Optional, List
from datetime import datetime, timedelta
import os
import secrets
import smtplib
import httpx
from email.message import EmailMessage
from jose import JWTError, jwt
from pydantic import BaseModel

from database import engine, get_db, Base
from models import User, File as FileModel, Folder, PasswordResetToken, SharedLink, LoginOTP, Activity
from schemas import (
    UserRegister, UserLogin, LoginOTPResponse, VerifyOTPRequest, ResendOTPRequest,
    ForgotPasswordRequest, ResetPasswordRequest, Token, UserOut, UserProfile,
    FileOut, FileRename, FileTrashOut, FolderCreate, FolderOut, FolderRename,
    DashboardStats, MessageResponse, ShareLinkOut, SharedFileOut
)
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, SECRET_KEY, ALGORITHM
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

# CORS middleware
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://cloudvault18.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    if file_type.startswith("text/") or file_type == "application/pdf" or "document" in file_type or "word" in file_type:
        return "Documents"
    return "Others"


def get_smtp_config():
    smtp_host = os.getenv("SMTP_SERVER") or os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_EMAIL") or os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@cloudvault.local")
    return smtp_host, smtp_port, smtp_user, smtp_password, smtp_from


def get_from_email():
    return (
        os.getenv("RESEND_FROM_EMAIL")
        or os.getenv("EMAIL_FROM")
        or os.getenv("SMTP_FROM")
        or os.getenv("SMTP_EMAIL")
        or "CloudVault <onboarding@resend.dev>"
    )


class EmailDeliveryError(Exception):
    pass


def cloudvault_email_html(title: str, body: str, button_text: str = None, button_url: str = None, code: str = None) -> str:
    button_html = ""
    if button_text and button_url:
        button_html = f"""
          <a href="{button_url}" style="display:inline-block;margin-top:22px;padding:13px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
            {button_text}
          </a>
        """
    code_html = ""
    if code:
        code_html = f"""
          <div style="margin:24px 0;padding:18px;background:#eef2ff;border-radius:10px;text-align:center;font-size:30px;letter-spacing:8px;font-weight:800;color:#3730a3;">
            {code}
          </div>
        """
    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#111827;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;padding:32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px;background:linear-gradient(135deg,#4f46e5,#0891b2);color:#ffffff;">
                    <div style="font-size:22px;font-weight:800;">CloudVault</div>
                    <div style="font-size:13px;opacity:.85;margin-top:4px;">Secure cloud storage</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px;">
                    <h1 style="font-size:24px;line-height:1.25;margin:0 0 12px;color:#111827;">{title}</h1>
                    <p style="font-size:15px;line-height:1.7;margin:0;color:#4b5563;">{body}</p>
                    {code_html}
                    {button_html}
                    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin-top:28px;">
                      If you did not request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def send_email(to_email: str, subject: str, text_body: str, html_body: str):
    resend_api_key = os.getenv("RESEND_API_KEY")
    if resend_api_key:
        send_email_with_resend(resend_api_key, to_email, subject, text_body, html_body)
        return

    smtp_host, smtp_port, smtp_user, smtp_password, smtp_from = get_smtp_config()
    if not smtp_host or not smtp_user or not smtp_password:
        print(f"Email not sent to {to_email}: {subject}\n{text_body}")
        if os.getenv("EMAIL_DEV_MODE", "false").lower() == "true":
            return
        raise EmailDeliveryError("SMTP is not configured")

    smtp_timeout = int(os.getenv("SMTP_TIMEOUT", "15"))
    use_ssl = os.getenv("SMTP_SSL", "false").lower() == "true" or smtp_port == 465
    use_tls = os.getenv("SMTP_TLS", "true").lower() == "true"

    if use_ssl:
        smtp_client = smtplib.SMTP_SSL
    else:
        smtp_client = smtplib.SMTP

    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = smtp_from
        message["To"] = to_email
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        with smtp_client(smtp_host, smtp_port, timeout=smtp_timeout) as server:
            if use_tls and not use_ssl:
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        print(f"Email delivery failed to {to_email}: {subject} ({type(exc).__name__}: {exc})")
        raise EmailDeliveryError("Email service is unavailable") from exc


def send_email_with_resend(api_key: str, to_email: str, subject: str, text_body: str, html_body: str):
    timeout = int(os.getenv("EMAIL_API_TIMEOUT", "15"))
    payload = {
        "from": get_from_email(),
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        response_text = exc.response.text[:500] if exc.response is not None else ""
        print(f"Resend delivery failed to {to_email}: {subject} ({exc.response.status_code}: {response_text})")
        raise EmailDeliveryError("Email service rejected the request") from exc
    except httpx.HTTPError as exc:
        print(f"Resend delivery failed to {to_email}: {subject} ({type(exc).__name__}: {exc})")
        raise EmailDeliveryError("Email service is unavailable") from exc


def raise_email_unavailable():
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Email service is currently unavailable. Please try again later."
    )


def try_send_optional_email(send_func, *args):
    try:
        send_func(*args)
    except EmailDeliveryError:
        return


def send_reset_email(to_email: str, reset_url: str):
    send_email(
        to_email,
        "Reset your CloudVault password",
        f"Reset your CloudVault password using this link. It expires in 15 minutes:\n\n{reset_url}",
        cloudvault_email_html(
            "Reset your password",
            "We received a request to reset your CloudVault password. This link expires in 15 minutes and can be used once.",
            "Reset Password",
            reset_url
        )
    )


def send_otp_email(to_email: str, otp: str):
    send_email(
        to_email,
        "Your CloudVault login code",
        f"Your CloudVault login code is {otp}. It expires in 5 minutes.",
        cloudvault_email_html(
            "Your login verification code",
            "Enter this 6-digit code to finish signing in to CloudVault. The code expires in 5 minutes.",
            code=otp
        )
    )


def send_password_changed_email(to_email: str):
    send_email(
        to_email,
        "Your CloudVault password was changed",
        "Your CloudVault password was changed successfully.",
        cloudvault_email_html(
            "Password changed",
            "Your CloudVault password was changed successfully. If this was not you, reset your password immediately."
        )
    )


def send_new_login_email(to_email: str):
    login_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    send_email(
        to_email,
        "New CloudVault login detected",
        f"A new login to your CloudVault account was detected at {login_time}.",
        cloudvault_email_html(
            "New login detected",
            f"A new login to your CloudVault account was completed at {login_time}. If this was you, no action is needed."
        )
    )


def send_welcome_email(to_email: str, username: str):
    send_email(
        to_email,
        "Welcome to CloudVault",
        f"Welcome to CloudVault, {username}.",
        cloudvault_email_html(
            "Welcome to CloudVault",
            f"Hi {username}, your CloudVault account is ready. You can now upload, organize, share, and recover your files securely."
        )
    )


def create_reset_jwt(user_id: int, jti: str) -> str:
    payload = {
        "user_id": user_id,
        "jti": jti,
        "purpose": "password_reset",
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_login_otp(db: Session, user: User) -> str:
    otp = f"{secrets.randbelow(1000000):06d}"
    db.query(LoginOTP).filter(
        LoginOTP.user_id == user.id,
        LoginOTP.used_at.is_(None)
    ).update({LoginOTP.used_at: func.now()})
    db.add(LoginOTP(
        otp_hash=hash_password(otp),
        user_id=user.id,
        attempts=0,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    ))
    return otp


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
    try_send_optional_email(send_welcome_email, new_user.email, new_user.username)
    
    access_token = create_access_token(data={"user_id": new_user.id})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/login", response_model=LoginOTPResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    otp = create_login_otp(db, db_user)
    db.commit()
    try:
        send_otp_email(db_user.email, otp)
    except EmailDeliveryError:
        db.query(LoginOTP).filter(
            LoginOTP.user_id == db_user.id,
            LoginOTP.used_at.is_(None)
        ).update({LoginOTP.used_at: func.now()})
        db.commit()
        raise_email_unavailable()
    return LoginOTPResponse(
        otp_required=True,
        email=db_user.email,
        message="Verification code sent to your email."
    )


@app.post("/login/verify-otp", response_model=Token)
def verify_login_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    otp_record = db.query(LoginOTP).filter(
        LoginOTP.user_id == user.id,
        LoginOTP.used_at.is_(None)
    ).order_by(desc(LoginOTP.created_at)).first()
    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    now = datetime.now(otp_record.expires_at.tzinfo) if otp_record.expires_at.tzinfo else datetime.utcnow()
    if otp_record.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")
    if otp_record.attempts >= 3:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please resend a new code.")

    if not verify_password(data.otp, otp_record.otp_hash):
        otp_record.attempts += 1
        if otp_record.attempts >= 3:
            otp_record.used_at = func.now()
        db.commit()
        if otp_record.attempts >= 3:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please resend a new code.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    otp_record.used_at = func.now()
    db.commit()
    try_send_optional_email(send_new_login_email, user.email)
    access_token = create_access_token(data={"user_id": user.id})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/login/resend-otp", response_model=MessageResponse)
def resend_login_otp(data: ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return MessageResponse(message="If the account exists, a new code has been sent.")

    latest_otp = db.query(LoginOTP).filter(
        LoginOTP.user_id == user.id
    ).order_by(desc(LoginOTP.created_at)).first()
    if latest_otp:
        now = datetime.now(latest_otp.created_at.tzinfo) if latest_otp.created_at and latest_otp.created_at.tzinfo else datetime.utcnow()
        elapsed = (now - latest_otp.created_at.replace(tzinfo=None) if latest_otp.created_at.tzinfo is None else now - latest_otp.created_at).total_seconds()
        if elapsed < 30:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting another code")

    otp = create_login_otp(db, user)
    db.commit()
    try:
        send_otp_email(user.email, otp)
    except EmailDeliveryError:
        db.query(LoginOTP).filter(
            LoginOTP.user_id == user.id,
            LoginOTP.used_at.is_(None)
        ).update({LoginOTP.used_at: func.now()})
        db.commit()
        raise_email_unavailable()
    return MessageResponse(message="A new verification code has been sent.")


@app.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        jti = secrets.token_urlsafe(16)
        token = create_reset_jwt(user.id, jti)
        reset_token = PasswordResetToken(
            token=jti,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        db.add(reset_token)
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
        try:
            send_reset_email(user.email, f"{frontend_url}/reset-password?token={token}")
        except EmailDeliveryError:
            print(f"Password reset email could not be delivered to {user.email}")

    return MessageResponse(message="If an account exists, a reset link has been sent.")


@app.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user_id = payload.get("user_id")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == jti,
        PasswordResetToken.used_at.is_(None)
    ).first()
    if not reset_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    now = datetime.now(reset_token.expires_at.tzinfo) if reset_token.expires_at.tzinfo else datetime.utcnow()
    if reset_token.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == user_id, User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(data.new_password)
    reset_token.used_at = func.now()
    db.commit()
    try_send_optional_email(send_password_changed_email, user.email)
    return MessageResponse(message="Password reset successfully")


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
    if len(file_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 10MB limit")
    
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
        return {
            "filename": file_record.original_name,
            "content_type": file_record.file_type,
            "data": file_data.hex()
        }
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
        FileModel.user_id == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    try:
        delete_file(file_record.file_path)
    except Exception as e:
        print(f"Warning: Could not delete from storage: {str(e)}")
    
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
        return {
            "filename": file_record.original_name,
            "content_type": file_record.file_type,
            "data": file_data.hex()
        }
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
    try_send_optional_email(send_password_changed_email, current_user.email)
    return MessageResponse(message="Password changed successfully")


# ============ Health Check ============
@app.get("/")
def root():
    return {"message": "CloudVault API is running", "version": "1.0.0"}
