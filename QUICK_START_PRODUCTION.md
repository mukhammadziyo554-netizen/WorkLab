# Production Deployment Quick Start

Get WorkLab running on a VPS in 30 minutes.

## Assumed Setup
- VPS with Ubuntu 22.04 LTS
- Domain: `yourdomain.com` pointing to VPS IP
- SSH access as `ubuntu` user with sudo access

## Step 1: Connect to VPS (2 min)

```bash
ssh ubuntu@yourdomain.com
# Or: ssh ubuntu@<VPS_IP>
```

## Step 2: Install System Dependencies (5 min)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx certbot
```

## Step 3: Clone & Setup Backend (8 min)

```bash
# Create app directory
sudo mkdir -p /opt/worklab /var/lib/worklab /var/log/worklab
sudo chown $USER:$USER /opt/worklab /var/lib/worklab /var/log/worklab

# Clone repo
git clone https://github.com/your-repo/worklab.git /opt/worklab
cd /opt/worklab/backend

# Setup Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cp .env.production.example .env
# Edit with your values:
nano .env
# Required: TELEGRAM_BOT_TOKEN, APP_PUBLIC_URL, WORKLAB_WEBAPP_URL, BACKEND_WEBHOOK_URL

# Initialize database
python3 -c "from database import init_database; init_database()"
```

## Step 4: Start Backend with PM2 (3 min)

```bash
cd /opt/worklab
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 status

# Verify
curl http://localhost:8000/health
```

## Step 5: Setup SSL Certificate (3 min)

```bash
sudo certbot certonly --standalone \
  -d yourdomain.com -d api.yourdomain.com \
  --agree-tos --register-unsafely-without-email
```

## Step 6: Configure Nginx (2 min)

```bash
# Copy config
sudo cp nginx.conf.example /etc/nginx/sites-available/worklab

# Edit domains
sudo sed -i 's/yourdomain.com/yourdomain.com/g' /etc/nginx/sites-available/worklab

# Enable
sudo ln -s /etc/nginx/sites-available/worklab /etc/nginx/sites-enabled/

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Deploy Frontend (3 min)

### Option A: Vercel (Recommended)
```bash
# Just set environment variable on Vercel dashboard:
# NEXT_PUBLIC_BACKEND_URL = https://api.yourdomain.com
# Then deploy
```

### Option B: VPS Build
```bash
cd /opt/worklab/frontend
npm install
npm run build
pm2 start "npm run start" --name worklab-frontend --cwd /opt/worklab/frontend
pm2 save
```

## Step 8: Register Telegram Webhook (1 min)

```bash
curl -X POST \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d '{"url":"https://api.yourdomain.com/telegram/webhook"}'
```

## Done! ✓

Test:
- Frontend: https://yourdomain.com
- API: https://api.yourdomain.com/health
- Telegram: Send message to bot, should get response

## Troubleshooting

### Backend not starting?
```bash
pm2 logs worklab-backend
```

### Nginx error?
```bash
sudo nginx -t
sudo systemctl status nginx
```

### SSL issues?
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## Next Steps

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup
2. Use [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for verification
3. Setup monitoring and backups
4. Configure firewall rules
5. Review security hardening section in DEPLOYMENT.md

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for complete documentation.
