# AgriCare Local Setup Guide

This guide walks you through setting up and running AgriCare on Windows (PowerShell) or Linux/macOS.

---

## System Requirements
- Node.js 18.x or 20.x (LTS recommended)
- npm 9.x or higher
- Modern web browser (Chrome, Edge, or Firefox) with Camera and Speech Synthesis permissions.

---

## 1. Quick Start (Single Command)

AgriCare is pre-configured with zero mandatory external dependencies for local development. The app includes realistic agronomic modeling, keyless Open-Meteo weather forecasts, and local state persistence out of the box.

```powershell
# 1. Install root, backend, and frontend dependencies
npm run install:all

# 2. Copy the environment template (optional for standard local run)
Copy-Item .env.example .env

# 3. Start both Client and Server concurrently
npm run dev
```

### URLs:
- **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 2. Windows PowerShell Commands

If you prefer installing individual modules:

```powershell
# Server setup
cd server
npm install
cd ..

# Client setup
cd client
npm install
cd ..

# Root launch
npm run dev
```

---

## 3. Production Build & Verification

To verify full TypeScript compilation and static asset generation:

```powershell
# Compiles both server TypeScript and client Vite bundle
npm run build
```

---

## 4. Port Conflict Handling
- Backend runs on `PORT 5000`. If port 5000 is occupied, adjust `PORT` in your `.env`.
- Frontend runs on Vite default `5173`. Vite will automatically pick `5174` if `5173` is busy. The client proxy connects to server port `5000`.
