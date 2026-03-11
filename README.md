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
