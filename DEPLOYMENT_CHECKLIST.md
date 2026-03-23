# WorkLab Production Deployment Checklist

Use this checklist to ensure all production deployment requirements are met before launching.

## 1. Infrastructure & Domain Setup

- [ ] **VPS Provisioned**
  - [ ] Ubuntu 22.04 LTS (or similar)
  - [ ] 2GB+ RAM
  - [ ] 2+ CPU cores
  - [ ] 30GB+ storage
  - [ ] SSH access enabled

- [ ] **Domain Registered & Configured**
  - [ ] Primary domain: `yourdomain.com`
  - [ ] API subdomain: `api.yourdomain.com`
  - [ ] Frontend subdomain (if applicable): `app.yourdomain.com`
  - [ ] DNS records point to VPS IP
  - [ ] DNS propagation verified

## 2. Backend Deployment

- [ ] **Server Setup**
  - [ ] System packages installed (`apt install`)
  - [ ] Python 3.11+ installed
  - [ ] Virtual environment created
  - [ ] Dependencies installed (`pip install -r requirements.txt`)

- [ ] **Environment Configuration**
  - [ ] `.env` file created from `.env.production.example`
  - [ ] `TELEGRAM_BOT_TOKEN` set ✓
  - [ ] `APP_PUBLIC_URL` set to `https://api.yourdomain.com` ✓
  - [ ] `WORKLAB_WEBAPP_URL` set correctly ✓
  - [ ] `BACKEND_WEBHOOK_URL` set correctly ✓
  - [ ] `CORS_ALLOWED_ORIGINS` configured ✓
  - [ ] All placeholder values replaced
  - [ ] `.env` file permissions restricted: `chmod 600`

- [ ] **Database Setup**
  - [ ] Database path configured: `/var/lib/worklab/worklab.db`
  - [ ] Directory created and permissions set
  - [ ] Initial migration/initialization run
  - [ ] Backup strategy defined

- [ ] **Process Management**
  - [ ] PM2 installed globally: `npm install -g pm2`
  - [ ] `ecosystem.config.js` updated with correct paths
  - [ ] Backend started: `pm2 start ecosystem.config.js`
  - [ ] Auto-restart enabled: `pm2 startup`
  - [ ] PM2 process list saved: `pm2 save`

- [ ] **Backend Health Check**
  - [ ] Health endpoint responds: `curl http://localhost:8000/health`
  - [ ] Returns 200 OK with valid database path
  - [ ] Logs show clean startup

## 3. Telegram Bot Configuration

- [ ] **Webhook Registration**
  - [ ] Webhook URL set with Telegram API
  - [ ] Command executed: `setWebhook` with correct URL
  - [ ] Webhook info verified: `getWebhookInfo` shows correct URL

- [ ] **Telegram Bot Features**
  - [ ] Bot token valid (verified with Telegram API)
  - [ ] Menu button configured
  - [ ] Mini App button opens correct URL
  - [ ] Webhook receives and processes messages correctly

- [ ] **Testing**
  - [ ] Send test message to bot in Telegram
  - [ ] Verify bot responds (check logs: `pm2 logs worklab-backend`)
  - [ ] Check webhook delivery status

## 4. SSL/TLS Certificates

- [ ] **Let's Encrypt Setup**
  - [ ] Certbot installed
  - [ ] Certificates obtained for all domains:
    - [ ] `yourdomain.com`
    - [ ] `api.yourdomain.com`
    - [ ] `app.yourdomain.com` (if applicable)
  - [ ] Certificates stored in `/etc/letsencrypt/live/yourdomain.com/`
  - [ ] Permissions are correct

- [ ] **Auto-Renewal**
  - [ ] Certbot renewal cron job configured
  - [ ] Renewal test passed: `certbot renew --dry-run`

## 5. Reverse Proxy (Nginx)

- [ ] **Configuration**
  - [ ] Nginx installed: `sudo apt install nginx`
  - [ ] Config copied from `nginx.conf.example`
  - [ ] Domain names replaced with actual domains
  - [ ] SSL certificate paths point to correct files
  - [ ] Backend proxying points to:  `http://127.0.0.1:8000`

- [ ] **Testing & Enablement**
  - [ ] Syntax check passed: `sudo nginx -t`
  - [ ] Site symlinked to `/etc/nginx/sites-enabled/`
  - [ ] Nginx reloaded: `sudo systemctl reload nginx`
  - [ ] Testing endpoint accessible:
    - [ ] `https://api.yourdomain.com/health` → 200
    - [ ] Security headers present in response

## 6. Frontend Deployment

### Option A: Vercel Deployment

- [ ] **Vercel Setup**
  - [ ] Project connected to GitHub/GitLab
  - [ ] `NEXT_PUBLIC_BACKEND_URL` environment variable set to `https://api.yourdomain.com`
  - [ ] Build and deployment successful
  - [ ] Frontend accessible via Vercel URL or custom domain

### Option B: VPS Deployment

- [ ] **Build**
  - [ ] Dependencies installed: `npm install`
  - [ ] Production build: `npm run build`
  - [ ] Build successful (no errors)

- [ ] **Process Management**
  - [ ] Started with PM2: `pm2 start "npm run start"`
  - [ ] Environment variable set
  - [ ] Process restarting correctly

- [ ] **Nginx Proxy** (if on VPS)
  - [ ] Nginx configured for port 3000 proxying
  - [ ] Accessible at `https://yourdomain.com` or `https://app.yourdomain.com`

## 7. Security Hardening

- [ ] **Firewall Configuration**
  - [ ] UFW enabled: `sudo ufw enable`
  - [ ] Rules configured:
    - [ ] Allow SSH (22)
    - [ ] Allow HTTP (80)
    - [ ] Allow HTTPS (443)
    - [ ] Backend port (8000) restricted to localhost/nginx only
  - [ ] Tested: `sudo ufw status`

- [ ] **Backend Security**
  - [ ] `CORS_ALLOWED_ORIGINS` restricted to frontend domain only
  - [ ] Rate limiting enabled in `.env`
  - [ ] Rate limit values reasonable
  - [ ] HTTPS enforced (no HTTP allowed)

- [ ] **Nginx Security**
  - [ ] Security headers configured:
    - [ ] `X-Frame-Options: SAMEORIGIN`
    - [ ] `X-Content-Type-Options: nosniff`
    - [ ] `Content-Security-Policy` set
  - [ ] SSL/TLS ciphers strong (TLS 1.2+)

- [ ] **File Permissions**
  - [ ] `.env` file: `600` (read/write owner only)
  - [ ] Database file: `644` (readable)
  - [ ] Logs directory: `755`

## 8. Logging & Monitoring

- [ ] **Application Logging**
  - [ ] Log files created: `/var/log/worklab/`
  - [ ] PM2 logs configured
  - [ ] Rotation configured (logrotate)

- [ ] **Monitoring Setup**
  - [ ] PM2 process monitoring active
  - [ ] Uptime monitoring configured (optional: Uptime Robot, etc.)
  - [ ] Alert contact configured

- [ ] **Log Access**
  - [ ] Backend logs accessible: `pm2 logs worklab-backend`
  - [ ] Nginx access logs: `/var/log/nginx/worklab-access.log`
  - [ ] Nginx error logs: `/var/log/nginx/worklab-error.log`

## 9. Backups & Disaster Recovery

- [ ] **Database Backups**
  - [ ] Backup directory created: `/backups/worklab/`
  - [ ] Automated daily backups configured
  - [ ] Retention policy set (e.g., keep 30 days)
  - [ ] Manual backup tested: works correctly
  - [ ] Restore procedure documented

- [ ] **Code Backups**
  - [ ] Git remote configured
  - [ ] Production tag created
  - [ ] Deployment procedure documented

## 10. Testing & Verification

### Endpoint Testing

- [ ] **API Endpoints**
  - [ ] Health check: `curl https://api.yourdomain.com/health` → 200
  - [ ] Telegram webhook: Test POST request → 200
  - [ ] Frontend API calls work
  - [ ] CORS headers present

- [ ] **Frontend**
  - [ ] Pages load correctly
  - [ ] API calls work (check browser DevTools Network tab)
  - [ ] Authentication works
  - [ ] No console errors

- [ ] **Telegram Bot**
  - [ ] Menu button visible
  - [ ] Menu button opens Mini App in Telegram
  - [ ] Mini App loads in Telegram
  - [ ] Mini App can communicate with backend
  - [ ] Bot replies to messages

- [ ] **SSL/HTTPS**
  - [ ] All traffic over HTTPS
  - [ ] Certificate chain valid
  - [ ] No mixed content warnings
  - [ ] SSL Labs check: A+ rating

## 11. Documentation

- [ ] **Deployment Documentation**
  - [ ] `DEPLOYMENT.md` created and updated
  - [ ] Environment variables documented
  - [ ] URLs and credentials stored securely
  - [ ] Runbooks/procedures written

- [ ] **Team Knowledge**
  - [ ] Team trained on deployment process
  - [ ] Troubleshooting guide reviewed
  - [ ] Contact escalation paths defined
  - [ ] Incident response procedures defined

## 12. Post-Deployment

- [ ] **Monitoring & Alerts**
  - [ ] CPU/Memory usage normal
  - [ ] Database performing well
  - [ ] No error spikes in logs
  - [ ] All health endpoints report OK

- [ ] **User Testing**
  - [ ] Production access limited to verified users initially
  - [ ] Feedback collected
  - [ ] Performance acceptable
  - [ ] No critical issues

- [ ] **Documentation Update**
  - [ ] README updated with production info
  - [ ] Links to production environment added
  - [ ] Team communicated go-live

## 13. Ongoing Maintenance

- [ ] **Regular Checks**
  - [ ] Weekly backup verification
  - [ ] Monthly SSL certificate expiry check
  - [ ] Monthly dependency updates review
  - [ ] Security patches applied promptly

- [ ] **Performance Monitoring**
  - [ ] API response times acceptable
  - [ ] Database queries optimized
  - [ ] No memory leaks detected

- [ ] **Log Review**
  - [ ] Weekly error log review
  - [ ] Suspicious activity investigated
  - [ ] Performance bottlenecks identified

---

## Sign-Off

- [ ] Deployment Manager: _________________ Date: _______
- [ ] System Administrator: ______________ Date: _______
- [ ] Team Lead: _______________________ Date: _______

---

## Notes & Issues

Use this space to document any issues encountered or special configurations:

```
[Add notes here]
```

---

## Rollback Plan

In case of critical issues:

1. Stop the backend: `pm2 stop worklab-backend`
2. Revert code: `git checkout <previous-tag>`
3. Restart backend: `pm2 start ecosystem.config.js`
4. Verify health: `curl https://api.yourdomain.com/health`
5. Check logs: `pm2 logs worklab-backend`

Contact support if issues persist.
