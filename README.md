# WorkLab

WorkLab is a full-stack SaaS platform where businesses create AI employees that automate customer support through Telegram.

## Project Structure

```text
worklab/
├─ frontend/                # Next.js + TypeScript + Tailwind CSS app
│  ├─ src/                  # Website, dashboard pages, and UI components
│  ├─ package.json
│  └─ ...
├─ backend/                 # Python + FastAPI services
│  ├─ main.py               # FastAPI app and API endpoints
│  ├─ telegram_bot.py       # Telegram webhook parsing and payload helpers
│  ├─ ai_agent.py           # Placeholder AI response generation
│  ├─ database.py           # SQLite schema and DB connection helpers
│  └─ requirements.txt
└─ README.md
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Production mode:

```bash
cd frontend
npm install
npm run build
npm start
```

## Run Backend

```bash
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Run Telegram Bot (From This Folder)

```bash
cd backend
cp .env.example .env
python3 run_telegram_bot.py
```

Bot behavior:
- On startup, bot configures persistent Telegram menu button: `Open WorkLab`.
- Pressing the menu button opens `WORKLAB_WEBAPP_URL` inside Telegram Mini App.
- Other text messages are forwarded to `BACKEND_WEBHOOK_URL` and replies are sent back to Telegram.

## Integration Notes

- Frontend and backend run independently.
- Frontend communicates with backend through HTTP APIs.
- Backend handles Telegram communication, AI processing, and database persistence.

## Deployment (GitHub -> Vercel + Backend)

### 1) Push to GitHub

If this is your first push from this project root:

```bash
cd /Users/muhammadziyo/WorkLab
gh auth login
gh repo create WorkLab --private --source=. --remote=origin --push
```

If the GitHub repo already exists:

```bash
cd /Users/muhammadziyo/WorkLab
git remote add origin https://github.com/<your-username>/WorkLab.git
git push -u origin main
```

### 2) Deploy Frontend on Vercel

- Import the GitHub repository in Vercel.
- Set Root Directory to `frontend`.
- Framework preset: Next.js (auto-detected).
- Build command: `npm run build`.
- Install command: `npm install`.
- Add environment variable:
	- `NEXT_PUBLIC_BACKEND_URL=https://<your-backend-domain>`

### 3) Deploy Backend (Render Blueprint Included)

This repository includes `render.yaml` for backend deployment.

- In Render, create a new Blueprint instance from this repo.
- Service root uses `backend` and starts FastAPI with Uvicorn.
- Health check path is `/health`.
- Persistent disk is mounted at `/var/data`.
- Set required environment variables in Render:
	- `TELEGRAM_BOT_TOKEN`
	- `APP_PUBLIC_URL=https://<your-backend-domain>`
	- `WORKLAB_WEBAPP_URL=https://<your-vercel-domain>`
	- `CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`
	- `BACKEND_WEBHOOK_URL=https://<your-backend-domain>/telegram/webhook`

### 4) Database Persistence

- Backend now supports configurable DB location via `WORKLAB_DB_PATH`.
- In Render blueprint this is set to `/var/data/worklab.db`, so SQLite data survives deploys/restarts.

## Telegram Mini App Connection (Bot + Web in Separate Projects)

Use URL-based integration only. No shared files are required between projects.

### 1) Bot Project

- Set `WORKLAB_WEBAPP_URL` to your deployed Next.js URL (for example `https://app.worklab.uz`).
- Set `APP_PUBLIC_URL` to your deployed backend URL (for example `https://api.worklab.uz`).
- Bot sets Telegram menu button via `setChatMenuButton` with:
	- Button text: `Open WorkLab`
	- Button type: `web_app`
	- URL: `WORKLAB_WEBAPP_URL`

### 2) Web Project (Next.js)

- Load Telegram SDK script: `https://telegram.org/js/telegram-web-app.js`
- Read Telegram Mini App context:
	- `window.Telegram.WebApp.initDataUnsafe.user`
	- `window.Telegram.WebApp.initData`
- Send auth request to backend:
	- `POST /telegram-auth`
	- JSON body includes `user` and `init_data`

### 3) Backend API (FastAPI)

- `POST /telegram-auth` accepts:
	- `init_data` (preferred and verified with `TELEGRAM_BOT_TOKEN`)
	- `user` (fallback payload)
- Backend behavior:
	- verifies Telegram signature when `init_data` is present
	- finds existing user by `telegram_id`
	- creates user if not found
	- creates session token and returns success response

### 4) Required Environment Variables

- Backend:
	- `TELEGRAM_BOT_TOKEN` for Telegram signature verification
	- `TELEGRAM_AUTH_MAX_AGE_SEC` (optional, default `86400`)
	- `APP_PUBLIC_URL` for backend public base URL (for example `https://api.worklab.uz`)
	- `WORKLAB_WEBAPP_URL` for the Mini App frontend URL (for example `https://app.worklab.uz`)
	- `CORS_ALLOWED_ORIGINS` for strict CORS whitelist (comma-separated; example `https://app.worklab.uz`)
	- `BACKEND_WEBHOOK_URL` (optional, defaults to `APP_PUBLIC_URL/telegram/webhook`)
- Frontend:
	- `NEXT_PUBLIC_BACKEND_URL` for API calls (for example `https://api.worklab.uz`)
