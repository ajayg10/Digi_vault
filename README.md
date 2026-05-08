DigiVault 🔐

A full-stack secure digital vault and productivity platform designed to securely manage files, projects, meetings, and authentication workflows with production-level backend architecture.

🚀 Overview

DigiVault is a cloud-ready secure vault system that combines:

Secure file storage
Project and note management
Meeting organization
Authentication & security
Real-time communication
SaaS-ready architecture

The platform is built using a modern full-stack architecture with FastAPI, PostgreSQL, and React.

✨ Features:

Authentication & Security
JWT-based authentication
Refresh token system
Password hashing with bcrypt
Email verification via SMTP
TOTP-based 2FA authentication
Protected API routes
File Vault System
File upload & download
Folder organization
Metadata management
Trash & restore functionality
File tagging & search
Storage quota management
Project Management
Create and manage projects
Add project notes
Track project status
Organize ideas and tasks
Meetings System
Meeting creation & tracking
Meeting notes & summaries
Agora integration for real-time communication
💳 Monetization Layer
Razorpay integration planning
Subscription-ready backend architecture
Premium feature support

🏗️ Tech Stack

Frontend:

-React
-Vite
-Tailwind CSS

Backend:
-FastAPI
-SQLAlchemy
-PostgreSQL
-Authentication & Security
-JWT
-PyOTP (2FA)
-SMTP Email Verification
-bcrypt
-Real-Time Communication
-Agora SDK

Deployment:
Vercel (Frontend)
HuggingFace (Backend)
PostgreSQL Cloud Hosting

🧱 Project Architecture:
Frontend (React)
        ↓
FastAPI Backend
        ↓
SQLAlchemy ORM
        ↓
PostgreSQL Database


📁 Repository Structure:

DigiVault/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   │
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md

⚙️ Environment Variables
Backend .env
DATABASE_URL=
SECRET_KEY=
ALGORITHM=HS256

MAIL_USERNAME=
MAIL_PASSWORD=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

AGORA_APP_ID=
AGORA_APP_CERTIFICATE=]

🚀 Local Setup:

1️⃣ Clone Repository
git clone https://github.com/ajayg10/Digi_vault.git
cd DigiVault
2️⃣ Backend Setup
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
3️⃣ Configure Environment Variables

Create .env inside backend:

DATABASE_URL=postgresql://postgres:password@localhost:5432/digital_vault
4️⃣ Run Backend
uvicorn app.main:app --reload
5️⃣ Frontend Setup
cd frontend

npm install
npm run dev
🌍 Deployment
Frontend

Deploy using:

Vercel
Backend

Deploy using:

Render
Railway
Database
PostgreSQL
Supabase / Railway PostgreSQL

🔥 Future Improvements:

End-to-end file encryption
AI-powered document summarization
Semantic search
Mobile application
Advanced sharing & collaboration
Cloud object storage integration

🧠 What This Project Demonstrates

This project showcases:

Full-stack application development
Backend engineering
Secure authentication systems
Database architecture
SaaS architecture
Cloud deployment
API design
Production debugging & deployment workflows
👨‍💻 Author

Ajay

📜 License

This project is intended for educational, portfolio, and development purposes.
