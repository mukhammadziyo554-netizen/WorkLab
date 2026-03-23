# 🤖 WorkLab - AI-Powered Customer Support Platform

> An innovative solution for automating customer support using AI employees integrated with Telegram

**Live Demo:** [https://frontend-gjmawb1kv-mukhammadziyo554-netizens-projects.vercel.app](https://frontend-gjmawb1kv-mukhammadziyo554-netizens-projects.vercel.app)

**GitHub Repository:** [https://github.com/mukhammadziyo554-netizen/WorkLab](https://github.com/mukhammadziyo554-netizen/WorkLab)

---

## 📋 Overview

WorkLab is a comprehensive SaaS platform that revolutionizes customer support automation. It empowers businesses to:

- **Create AI Employees**: Design intelligent customer support agents with minimal configuration
- **Automate on Telegram**: Reach customers where they are—directly through Telegram Mini Apps
- **Build Knowledge Bases**: Train AI agents on your company's documentation and processes
- **Analyze Performance**: Track conversations, response quality, and customer satisfaction metrics
- **Scale Effortlessly**: Handle unlimited conversations without manual intervention

The platform combines modern full-stack development with AI integration, providing a production-ready solution for enterprise customer support automation.

---

## ✨ Key Features

### 🔧 AI Employee Management
- **Easy Configuration**: Create AI employees through an intuitive dashboard
- **Knowledge Integration**: Upload and manage knowledge bases for accurate responses
- **Customizable Behavior**: Define personality, tone, and response rules per employee

### 💬 Telegram Integration
- **Mini App Experience**: Seamless Telegram Mini App for customer interactions
- **Real-time Updates**: Webhook-based updates for instant message handling
- **Bot Commands**: Support for /help, /settings, and custom Telegram commands

### 📊 Analytics Dashboard
- **Conversation Analytics**: Track conversation volume, duration, and customer satisfaction
- **Performance Metrics**: Monitor AI employee response quality and customer engagement
- **Insights & Reports**: Generate actionable insights from customer interactions

### 🛡️ Enterprise Features
- **CORS Security**: Domain-restricted API access
- **Rate Limiting**: API usage controls and throttling
- **Audit Logging**: Complete history of all operations
- **Database Encryption**: SQLite with secure storage patterns

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org) (React with Server Components)
- **Language**: TypeScript for type-safe development
- **Styling**: [Tailwind CSS](https://tailwindcss.com) for responsive design
- **Authentication**: Telegram Mini App integration with HMAC-SHA256 verification
- **UI Components**: Custom components + Telegram UI compatibility
- **Internationalization**: Multi-language support (English, Russian, Uzbek)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com) (Python 3.11+)
- **Server**: Uvicorn with async/await support
- **Database**: SQLite with connection pooling
- **Telegram**: Webhook-based bot updates (not polling)
- **AI Integration**: Extensible architecture for LLM integration
- **Security**: Input validation via Pydantic, CORS middleware

### DevOps & Deployment
- **Frontend Hosting**: [Vercel](https://vercel.com) (auto-scaling, CDN)
- **Backend Hosting**: VPS-ready (PM2, Docker, Systemd support)
- **Process Management**: PM2 with auto-restart and memory limits
- **Reverse Proxy**: Nginx with SSL/TLS and security headers
- **SSL/TLS**: Let's Encrypt automated certificate management
- **Containerization**: Docker & Docker Compose ready

---

## 📁 Project Structure

```text
worklab/
├── frontend/                   # Next.js SPA application
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities and helpers
│   │   └── locales/           # i18n translations (EN, RU, UZ)
│   ├── package.json
│   └── tsconfig.json
├── backend/                    # FastAPI Python server
│   ├── main.py                # API endpoints and Telegram webhook
│   ├── telegram_bot.py        # Telegram Mini App integration
│   ├── ai_agent.py            # AI response generation
│   ├── database.py            # Database schema and ORM
│   ├── models/                # Pydantic models
│   ├── routers/               # API route handlers
│   ├── services/              # Business logic
│   ├── requirements.txt
│   └── .env.example
├── scripts/                    # Helper scripts for development
├── DEPLOYMENT.md              # Production deployment guide
├── SECURITY.md                # Security best practices
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.11+**
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mukhammadziyo554-netizen/WorkLab.git
   cd WorkLab
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

3. **Setup Backend** (in another terminal)
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Telegram bot token and URLs
   python3 -m pip install -r requirements.txt
   python3 run_backend.py
   # Backend API runs on http://localhost:8000
   ```

4. **Optional: Run Telegram Bot**
   ```bash
   cd backend
   python3 run_telegram_bot.py
   # For webhook mode, ensure backend is accessible via HTTPS
   ```

### Using Helper Scripts (Recommended)

For easier local development:

```bash
./scripts/dev-start.sh   # Start both frontend and backend
./scripts/dev-status.sh  # Check process status
./scripts/dev-stop.sh    # Stop both services
```

---

## 🌐 Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Backend (`.env`)
```
TELEGRAM_BOT_TOKEN=your-token-here
APP_PUBLIC_URL=https://api.yourdomain.com
WORKLAB_WEBAPP_URL=https://app.yourdomain.com
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
```

See `frontend/.env.example` and `backend/.env.example` for all options.

---

## 🧪 Build & Production

### Frontend Build
```bash
cd frontend
npm run build
npm run start  # Production server
```

### Deploy to Vercel (Recommended)
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Backend Deployment Options

Choose one based on your infrastructure:

**Option 1: PM2 (Recommended for simplicity)**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save  # Persist across restarts
```

**Option 2: Docker Compose (Recommended for isolation)**
```bash
docker-compose up -d
# Full stack (backend + database) in containers
```

**Option 3: Traditional VPS with Systemd**
```bash
sudo cp worklab-backend.service /etc/systemd/system/
sudo systemctl enable worklab-backend
sudo systemctl start worklab-backend
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production setup instructions.

---

## 🔌 Telegram Integration

### Setup Telegram Bot

1. Create a bot on Telegram using [@BotFather](https://t.me/BotFather)
2. Copy the bot token and add to `.env`
3. Register webhook with Telegram:
   ```bash
   curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://yourdomain.com/telegram/webhook
   ```

### Mini App Flow

The application provides a complete Telegram Mini App experience:

1. User starts conversation with bot
2. Bot shows "Open WorkLab" menu button
3. Clicks button → Opens Mini App in Telegram
4. Mini App verifies user with backend
5. Backend handles AI responses via `/telegram/webhook`

---

## 🌍 Internationalization

Support for English, Russian, and Uzbek:
- Locale files: `frontend/src/locales/{en,ru,uz}.json`
- Managed by `LanguageProvider` component
- Persisted in `localStorage`
- Dynamic switching without page reload

---

## 📚 Technical Documentation

### For Developers
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production setup guide (VPS, SSL, monitoring)
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[QUICK_START_PRODUCTION.md](./QUICK_START_PRODUCTION.md)** - 30-minute setup guide

### For Security & Operations
- **[SECURITY.md](./SECURITY.md)** - Security best practices, CORS, rate limiting, incident response

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Telegram Users                        │
└────────────────────┬────────────────────────────────────┘
                     │
                 Telegram API
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼──────┐           ┌────▼──────────┐
    │   Telegram│           │              │
    │ Mini App  │           │   Bot        │
    │ (Frontend)│           │ (/webhook)   │
    └────┬──────┘           └────┬──────────┘
         │                       │
         │ HTTPS                 │ Webhook POST
         │                       │
    ┌────┴───────────────────────▼──────┐
    │      Nginx (Reverse Proxy)        │
    │      • SSL/TLS Termination        │
    │      • Rate Limiting              │
    │      • Security Headers           │
    └────┬──────────┬────────────────────┘
         │          │
    ┌────▼────┐ ┌───▼────────────┐
    │ Frontend │ │ Backend API    │
    │(React)   │ │(FastAPI)       │
    │Vercel    │ │ VPS:8000       │
    │          │ │ • Auth         │
    │• i18n    │ │ • AI Engine    │
    │• Auth    │ │ • Database     │
    │• UI      │ │ • Admin Panel  │
    └──────────┘ └────────────────┘
```

---

## 📊 Key Endpoints

### Frontend
- **Home**: `/`
- **Dashboard**: `/dashboard`
- **Admin Panel**: `/admin`
- **Telegram Mini App**: `/telegram-bot`
- **Authentication**: `/login`, `/signup`

### Backend (API)
- **Health Check**: `GET /health`
- **Telegram Webhook**: `POST /telegram/webhook`
- **Authentication**: `POST /telegram-auth`
- **Admin Endpoints**: `GET/POST /admin/*`
- **User Management**: `GET/POST /users/*`
- **Bot Configuration**: `POST /telegram/webhook/configure`

---

## 🔒 Security Features

- ✅ **Telegram HMAC-SHA256 Signature Verification**
- ✅ **CORS Headers** - Domain-restricted API access
- ✅ **Rate Limiting** - 100 requests per 60 seconds per IP
- ✅ **HTTPS/TLS** - Let's Encrypt SSL certificates
- ✅ **Input Validation** - Pydantic models with constraints
- ✅ **Security Headers** - CSP, X-Frame-Options, HSTS
- ✅ **Environment Secrets** - Protected via .env (not in git)

---

## 📈 Performance

- **Frontend**: Vercel global CDN, ~50ms latency worldwide
- **Backend**: Uvicorn async server, support for thousands of concurrent connections
- **Database**: SQLite with connection pooling
- **API**: Response times typically <200ms

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is provided as-is for portfolio and educational purposes.

---

## 📧 Contact & Support

- **Repository**: [GitHub - WorkLab](https://github.com/mukhammadziyo554-netizen/WorkLab)
- **Live Demo**: [Vercel Deployment](https://frontend-gjmawb1kv-mukhammadziyo554-netizens-projects.vercel.app)

### Key Files for Production

- **Backend**: `ecosystem.config.js` - PM2 process management
- **Docker**: `Dockerfile.backend` - Container image for backend
- **Docker Compose**: `docker-compose.yml` - Complete stack with Docker
- **Systemd**: `worklab-backend.service` - Alternative systemd service
- **Nginx**: `nginx.conf.example` - Reverse proxy configuration
- **Env Templates**:
  - `backend/.env.production.example` - Production environment variables
  - `backend/.env.example` - Development environment variables
  - `frontend/.env.example` - Frontend environment variables

### Deployment Options

1. **Vercel + VPS**  (Recommended)
   - Frontend on Vercel  (auto-scaling, fast CDN)
   - Backend on VPS with PM2 (simple, full control)
   - See [DEPLOYMENT.md](./DEPLOYMENT.md)

2. **Docker + VPS**
   - Containerized backend for easy deployment
   - See `docker-compose.yml`

3. **Systemd + VPS**
   - Traditional systemd service  for long-term reliability
   - See `worklab-backend.service`

### Health Check

Once deployed, verify your setup:

```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend health (if on VPS)
curl https://yourdomain.com

# Telegram webhook status
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
```

### Support

For deployment questions, refer to:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Verification checklist
- [QUICK_START_PRODUCTION.md](./QUICK_START_PRODUCTION.md) - Fast setup
