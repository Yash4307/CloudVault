# CloudVault

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?style=flat-square)](#tech-stack)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)](#tech-stack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase-3ecf8e?style=flat-square)](#tech-stack)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

CloudVault is a full-stack cloud storage application inspired by Google Drive and Dropbox. It lets users upload, organize, preview, share, restore, and permanently delete files through a modern responsive web interface.

The project is built as a portfolio-ready production deployment with a React frontend on Vercel, a FastAPI backend on Render, PostgreSQL hosted through Supabase, and private Supabase Object Storage for uploaded files.

## Live Demo

Frontend: https://cloudvault18.vercel.app

Backend: https://cloudvault-l070.onrender.com

Note: the backend is hosted on Render Free and may take 30-60 seconds to wake up after inactivity.

## Project Status

The `main` branch is the deployment-safe version. It uses standard JWT login and removes email/SMTP-dependent authentication flows so the application can deploy reliably on Render and Vercel.

The previous email-enabled implementation, including OTP login, forgot password, reset password, and transactional email integrations, is preserved on:

```bash
smtp-feature
```

You can switch to it locally with:

```bash
git switch smtp-feature
```

## Features

### Authentication

- User registration with hashed passwords
- JWT login
- Protected frontend routes
- Authenticated API access using bearer tokens
- Profile page with account and storage statistics
- Change password from the profile page

### File Management

- Upload files to private Supabase Storage
- Multi-file upload support
- Drag-and-drop upload UI
- Download files
- Rename files
- Soft delete files into Trash
- Restore files from Trash
- Permanently delete files
- File metadata display: name, size, type, and date
- File type icons for common formats

### Folder Management

- Create folders
- Rename folders
- Delete folders
- Navigate nested folders
- Breadcrumb navigation
- Folder filtering in the file browser

### Preview And Sharing

- Preview support for common file types such as images, PDFs, and text files
- Public read-only share links
- Shared file view route
- Shared file download route

### Dashboard

- Total files
- Total folders
- Storage used
- Recent files
- Storage usage by category
- Activity feed for uploads, deletes, restores, and folder actions

### User Experience

- Responsive layout for desktop and mobile
- Dark and light theme support
- Grid and list file views
- Toast notifications
- Loading states
- Empty states
- Framer Motion animations
- Polished login and registration screens

## Screenshots

Add screenshots to `docs/screenshots/` and reference them here. Suggested screenshots:

- Login page
- Register page
- Dashboard
- File browser
- Upload modal
- File preview
- Shared file page
- Trash page
- Profile page

Recommended structure:

```text
docs/
└── screenshots/
    ├── login.png
    ├── dashboard.png
    ├── files.png
    ├── upload.png
    ├── preview.png
    ├── sharing.png
    ├── trash.png
    └── profile.png
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion |
| Routing | React Router |
| API Client | Axios |
| Backend | FastAPI, Uvicorn, Pydantic |
| Database ORM | SQLAlchemy |
| Database | PostgreSQL on Supabase |
| Storage | Supabase Object Storage |
| Authentication | JWT, bcrypt password hashing |
| Deployment | Vercel frontend, Render backend |

## Architecture

```text
React + Vite Frontend (Vercel)
            |
            v
FastAPI Backend (Render)
            |
            v
PostgreSQL Database (Supabase)
            |
            v
Private Supabase Object Storage
```

The frontend talks to the backend through Axios. The backend handles authentication, file metadata, folder organization, dashboard statistics, activity records, and storage operations. File bytes are stored in Supabase Storage, while metadata and ownership rules live in PostgreSQL.

## Project Structure

```text
CloudVault/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── storage.py
│   ├── migrations/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── AuthContext.jsx
│   ├── index.html
│   ├── package.json
│   └── vercel.json
├── docs/
├── LICENSE
└── README.md
```

## Backend API Summary

### Auth And User

- `POST /register` - create user account
- `POST /login` - login and receive JWT
- `GET /profile` - get profile and storage stats
- `PUT /profile/change-password` - update password

### Files

- `POST /files/upload` - upload file
- `GET /files` - list files
- `GET /files/{id}` - get file metadata
- `GET /files/{id}/download` - download file
- `PUT /files/{id}/rename` - rename file
- `DELETE /files/{id}` - soft delete file
- `GET /files/trash` - list deleted files
- `POST /files/{id}/restore` - restore file
- `DELETE /files/{id}/permanent` - permanently delete file
- `POST /files/{id}/share` - create share link

### Folders

- `POST /folders` - create folder
- `GET /folders` - list folders
- `PUT /folders/{id}/rename` - rename folder
- `DELETE /folders/{id}` - delete folder

### Dashboard And Sharing

- `GET /dashboard` - dashboard statistics and activity
- `GET /share/{token}` - public shared file metadata
- `GET /share/{token}/download` - public shared file download

## Database Overview

The main entities are:

- `users` - account details and hashed passwords
- `files` - file metadata, ownership, folder relation, trash state
- `folders` - folder hierarchy and ownership
- `shared_links` - public read-only file share tokens
- `activities` - dashboard activity feed records

Each file and folder query is scoped by `user_id`, so users only access their own resources. Shared links are token-based public read-only access points.

## Local Development

### Backend

```bash
cd backend
python -m venv cloud_proj
cloud_proj\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

## Environment Variables

Do not commit `.env` files. They are intentionally ignored by Git.

### Backend `.env`

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_BUCKET=cloudvault-files
JWT_SECRET_KEY=
FRONTEND_URL=http://127.0.0.1:5173
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

For deployment, set these in Render:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_BUCKET=cloudvault-files
JWT_SECRET_KEY=
FRONTEND_URL=https://cloudvault18.vercel.app
ALLOWED_ORIGINS=https://cloudvault18.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

### Frontend `.env`

```env
VITE_API_URL=http://127.0.0.1:8000
```

For deployment, set this in Vercel:

```env
VITE_API_URL=https://cloudvault-l070.onrender.com
```

## Deployment

### Render Backend

- Root directory: `backend`
- Build command:

```bash
pip install -r requirements.txt
```

- Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Vercel Frontend

- Root directory: `frontend`
- Build command:

```bash
npm run build
```

- Output directory:

```text
dist
```

The `frontend/vercel.json` file includes SPA rewrites so direct routes such as `/login`, `/files`, and `/share/:token` work correctly after deployment.

## Security Notes

- Passwords are hashed with bcrypt.
- JWT protects private API routes.
- Supabase Storage bucket is private.
- File and folder operations are scoped to the authenticated user.
- `.env`, virtual environments, cache folders, `node_modules`, and build output are ignored by Git.
- Secrets should be configured only through local `.env` files or deployment provider environment variables.

## Future Enhancements

- Reintroduce email OTP authentication from `smtp-feature`
- Forgot password and reset password through a reliable transactional email provider
- File version history
- End-to-end file encryption
- Team workspaces
- Role-based sharing permissions
- Real-time collaboration
- File comments
- Desktop sync client
- Storage quota enforcement per plan

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
