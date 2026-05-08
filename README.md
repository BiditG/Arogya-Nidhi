## Arogya Nidhi - Local Setup (Windows)

This project has 2 apps:

1. `backend` (Node + Express + Prisma + PostgreSQL)
2. `frontend` (Vite + React app for patient, doctor, student, and admin portals)

## Prerequisites

1. Install Node.js 20+ (LTS recommended)
2. Install PostgreSQL 14+
3. Create the database you use in `backend/.env` (currently `arogya-nidhi`)

## 1) Install dependencies

Run these commands from project root:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## 2) Configure environment variables

Open the existing env files and ensure values are correct:

1. `backend/.env`
2. `frontend/.env.local`

Then ensure `backend/.env` has at least:

1. `DATABASE_URL` (your PostgreSQL connection string)
2. `JWT_SECRET`
3. `JWT_REFRESH_SECRET`
4. `ADMIN_EMAIL`
5. `ADMIN_PASSWORD`

Example `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/arogyanidhi?schema=public
```

Note: this codebase is configured for PostgreSQL via Prisma. MongoDB is not required for normal startup.

## 3) Run Prisma setup

From `backend` folder:

```powershell
npx prisma generate
npx prisma migrate deploy
```

If your local DB is fresh and has no migration history, run:

```powershell
npx prisma migrate dev
```

## 4) Start all apps (2 terminals)

Terminal 1 (backend):

```powershell
cd backend
npm run server
```

Terminal 2 (frontend):

```powershell
cd frontend
npm run dev
```

## 5) Open in browser

1. Frontend: http://localhost:5173
2. Admin portal: http://localhost:5173/admin-portal
3. Backend API: http://localhost:3001

## Common issues

1. `P1001` or DB connection errors
	- Check PostgreSQL is running and `DATABASE_URL` credentials are correct.
2. CORS/API failures in frontend
	- Ensure backend is running on port `3001`.
3. Prisma client errors after schema change
	- Run `npx prisma generate` again in `backend`.
