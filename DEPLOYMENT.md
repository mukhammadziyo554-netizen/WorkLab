# WorkLab Production Deployment Guide

This guide covers deploying WorkLab to a VPS for 24/7 production use without ngrok.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [VPS Setup](#vps-setup)
4. [Backend Deployment](#backend-deployment)
5. [Telegram Bot Configuration](#telegram-bot-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [SSL/HTTPS Setup](#ssltls)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Domain: yourdomain.com
├── API (Backend): api.yourdomain.com → VPS:8000
├── Web App (Frontend): app.yourdomain.com → Vercel (or separate VPS)
└── Telegram Bot: webhook → api.yourdomain.com/telegram/webhook
```

**Key Points:**
- Backend runs on VPS (DigitalOcean, Hetzner, Linode, etc.)
- Frontend deployed on Vercel or same VPS
- Telegram bot uses webhook mode (no polling)
- Nginx reverse proxy handles SSL and routing

---

## Prerequisites

- **VPS** with 2GB+ RAM, 2+ CPU cores
  - Ubuntu 22.04 LTS recommended
  - Root or sudo access
- **Domain name** pointed to VPS
- **Telegram Bot Token** from @BotFather
- **Stripe keys** (if using payments)
- **SSH access** to VPS

---

## VPS Setup

### Step 1: Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  curl \
  wget \
  git \
  python3 \
  python3-venv \
  python3-pip \
  nodejs \
  npm \
  postgresql \
  nginx \
  certbot \
  certbot-nginx \
  build-essential

# Create worklab user
sudo useradd -m -s /bin/bash worklab
sudo usermod -aG sudo worklab
```

### Step 2: Create Application Directory

```bash
# As root or with sudo
sudo mkdir -p /opt/worklab
sudo chown -R worklab:worklab /opt/worklab
sudo mkdir -p /var/lib/worklab /var/log/worklab
sudo chown -R worklab:worklab /var/lib/worklab /var/log/worklab
```

### Step 3: Install PM2 (Global Process Manager)

```bash
sudo npm install -g pm2
pm2 completion install
```

### Step 4: Clone Repository

```bash
sudo -u worklab git clone https://github.com/your-repo/worklab.git /opt/worklab
cd /opt/worklab
sudo chown -R worklab:worklab .
```

---

## Backend Deployment

### Step 1: Setup Python Virtual Environment

```bash
cd /opt/worklab/backend
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
# Copy example .env
cp .env.production.example .env

# Edit with your values
nano .env
```

**Required .env values:**
```
ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=your_actual_token
APP_PUBLIC_URL=https://api.yourdomain.com
WORKLAB_WEBAPP_URL=https://app.yourdomain.com
BACKEND_WEBHOOK_URL=https://api.yourdomain.com/telegram/webhook
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
WORKLAB_DB_PATH=/var/lib/worklab/worklab.db
```

### Step 3: Initialize Database

```bash
# Run database initialization
python3 -c "from database import init_database; init_database()"
```

### Step 4: Start Backend with PM2

```bash
# From project root
cd /opt/worklab
pm2 start ecosystem.config.js

# Verify
pm2 list
pm2 logs worklab-backend

# Save PM2 config
pm2 save

# Enable auto-start on boot
pm2 startup
# Copy and run the command it outputs
```

### Step 5: Verify Backend Health

```bash
curl -I http://localhost:8000/health
# Should return 200 OK
```

---

## Telegram Bot Configuration

### Step 1: Register Webhook with Telegram

Your webhook endpoint is already built into the backend at:
```
POST /telegram/webhook
```

### Step 2: Set Telegram Webhook

Make this API call (replace `TOKEN` with your bot token):

```bash
curl -X POST \
  "https://api.telegram.org/botTOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://api.yourdomain.com/telegram/webhook\"}"
```

### Step 3: Verify Webhook

```bash
curl -X POST \
  "https://api.telegram.org/botTOKEN/getWebhookInfo"
```

**Expected response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://api.yourdomain.com/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "YOUR_VPS_IP",
    "last_error_date": 0,
    "max_connections": 40
  }
}
```

### Step 4: Configure Mini App Menu Button

The menu button setup is in `run_telegram_bot.py`. When the backend starts, it automatically:
1. Sets a persistent menu button: "Open WorkLab"
2. Menu button opens the Mini App at `WORKLAB_WEBAPP_URL`

---

## Frontend Deployment

### Option A: Deploy on Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

**Environment variables on Vercel:**
- `NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com`

### Option B: Deploy on VPS

```bash
# Build frontend
cd /opt/worklab/frontend
npm install
npm run build

# Start with PM2
pm2 start "npm run start" --name worklab-frontend --cwd /opt/worklab/frontend

# Save
pm2 save
```

---

## SSL/TLS Certificate Setup

### Step 1: Get SSL Certificate with Let's Encrypt

```bash
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  -d app.yourdomain.com \
  --agree-tos \
  --register-unsafely-without-email
```

### Step 2: Configure Nginx

```bash
# Copy Nginx config template
sudo cp nginx.conf.example /etc/nginx/sites-available/worklab

# Edit with your domain
sudo nano /etc/nginx/sites-available/worklab
# Replace yourdomain.com with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/worklab /etc/nginx/sites-enabled/

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Step 3: Auto-Renew SSL Certificates

```bash
# Create renewal script
sudo nano /etc/cron.daily/renewable-certs
```

Add:
```bash
#!/bin/bash
certbot renew --quiet
systemctl reload nginx
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/renewable-certs
```

---

## Security Hardening

### Enable Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # Backend (restrict to nginx only in production)
```

### CORS Configuration

In backend `.env`:
```
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
```

### Rate Limiting

In backend `.env`:
```
ENABLE_RATE_LIMITING=true
RATE_LIMIT_CALLS=100
RATE_LIMIT_PERIOD=60
```

### Security Headers (via Nginx)

Already included in `nginx.conf.example`:
- `X-Frame-Options: SAMEORIGIN` (prevent clickjacking)
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy` headers

---

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
pm2 logs worklab-backend

# Nginx logs
sudo tail -f /var/log/nginx/worklab-access.log
sudo tail -f /var/log/nginx/worklab-error.log

# System logs
journalctl -xe
```

### Monitor Processes

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Restart specific process
pm2 restart worklab-backend

# Stop all
pm2 stop all
```

### Database Backups

```bash
# Create backup
mkdir -p /backups/worklab
cp /var/lib/worklab/worklab.db /backups/worklab/worklab-$(date +%Y%m%d_%H%M%S).db

# Or setup automated daily backups:
#!/bin/bash
BACKUP_DIR="/backups/worklab"
DB_FILE="/var/lib/worklab/worklab.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp "$DB_FILE" "$BACKUP_DIR/worklab-$TIMESTAMP.db"
# Keep only last 30 days
find "$BACKUP_DIR" -name "worklab-*.db" -mtime +30 -delete
```

---

## Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs worklab-backend

# Check if port is in use
lsof -i :8000

# Test Python import
cd /opt/worklab/backend && python3 -c "from main import app; print('OK')"
```

### Telegram webhook not working
```bash
# Test webhook endpoint
curl -X POST https://api.yourdomain.com/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"update_id": 1, "message": {"chat": {"id": 123}, "text": "test"}}'

# Check recent webhook errors
curl "https://api.telegram.org/botTOKEN/getWebhookInfo" | jq '.result.last_error_message'
```

### High memory usage
```bash
# Monitor memory
pm2 monit

# Check memory limit in ecosystem.config.js
# Increase max_memory_restart if needed
```

### SSL certificate issues
```bash
# Check certificate expiry
sudo certbot certificates

# Renew debug
sudo certbot renew --dry-run --verbose
```

---

## Deployment Checklist

- [ ] VPS created and configured
- [ ] Domain DNS pointing to VPS
- [ ] Python virtual environment setup
- [ ] Backend .env configured
- [ ] Database initialized
- [ ] Backend running with PM2
- [ ] SSL certificates obtained
- [ ] Nginx configured and running
- [ ] Frontend deployed (Vercel or VPS)
- [ ] Telegram webhook registered
- [ ] Stripe keys configured (if using)
- [ ] Firewall rules configured
- [ ] Monitoring setup (PM2, logs)
- [ ] Backups configured
- [ ] Documentation updated

---

## Upgrading in Production

```bash
cd /opt/worklab

# Pull latest code
git pull origin main

# Activate venv
source backend/venv/bin/activate

# Install new dependencies (if any)
pip install -r backend/requirements.txt

# Reload backend (zero-downtime)
pm2 reload ecosystem.config.js

# Or rebuild frontend (if needed)
cd frontend && npm run build && pm2 reload worklab-frontend
```

---

## Support

For issues, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/*.log`
3. System logs: `journalctl -xe`
4. Backend error output: `pm2 logs worklab-backend --err`

Contact: Support for additional help with your specific deployment.
