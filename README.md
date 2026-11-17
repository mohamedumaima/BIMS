# Business Management & Import Export System

**A System for Business Operations Management**
BIET Campus — Faculty of Computing — Advanced Program in Software Engineering (2026)
- **Researcher:** M L Umaima
- **Supervisor:** W.A. S. M. S. Thilakarathna

## Tech Stack (JavaScript)
- **Frontend:** React 19, Vite, Tailwind CSS v4, Redux Toolkit, React Router, Axios, Recharts
- **Backend:** Node.js, Express 5, JWT Auth + RBAC (`ADMIN`, `MANAGER`, `STAFF`), Zod, Multer, PDFKit
- **Database & Storage:** PostgreSQL (Local Dev) + Supabase PostgreSQL & Storage (Cloud/Vercel), Prisma ORM 7
- **Deployment:** GitHub + Vercel (separate `server` API project & `client` SPA project)

## Project Structure
```text
.
├── client/                 # React + Vite + Tailwind + Redux Toolkit SPA
├── server/                 # Express 5 + Prisma 7 REST API (Vercel Node Backend)
├── docs/                   # Architecture & schema notes
├── final Project Proposal.pdf
└── Business_Management_ImportExport_Presentation.pdf
```

## Quick Start (Local Development)

### 1. Backend Setup (`server/`)
```bash
cd server
cp .env.example .env
# Edit server/.env with your local PostgreSQL password for import_export_db
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 2. Frontend Setup (`client/`)
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:5000`.
