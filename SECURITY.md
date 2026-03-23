# Security Best Practices for WorkLab

This guide covers security best practices for WorkLab production deployment.

## 1. Secrets Management

### Never Commit Secrets

**CRITICAL**: Environment variables containing API keys, tokens, or passwords must NEVER be committed to git.

```bash
# ❌ DO NOT DO THIS
git add backend/.env
git commit -m "Add env config"

# ✅ DO THIS INSTEAD
echo "backend/.env" >> .gitignore
# Set variables on your hosting platform (Render, Vercel, VPS)
```

### Where to Store Secrets

| Environment | Storage | Method |
|---|---|---|
| **Development** | `.env` file (git-ignored) | Manual file, not committed |
| **Staging** | CI/CD platform secrets | GitHub Secrets, Vercel Secrets |
| **Production** | Hosting platform | Render Environment, Vercel Dashboard, VPS env |

### Secret Rotation

Regularly rotate sensitive values:

```bash
# Telegram Bot Token
- Go to @BotFather
- Create new token if compromised

# Stripe Keys
- Regenerate in Stripe Dashboard if exposed

# Database passwords (if using Postgres)
- Update database password periodically
```

## 2. HTTPS / TLS

### Always Use HTTPS

- **Frontend**: Vercel provides free HTTPS
- **Backend**: Use Let's Encrypt (free) with certbot
- **API calls**: All requests must be over HTTPS

```bash
# Certificate monitoring
sudo certbot certificates

# Auto-renewal
sudo certbot renew --dry-run
```

### SSL/TLS Configuration

Best practices in `nginx.conf.example`:
- TLS 1.2 and 1.3 only (no older protocols)
- Strong ciphers (HIGH:!aNULL:!MD5)
- HSTS headers (force HTTPS)
- Certificate stapling (improved performance)

## 3. API Security

### CORS Configuration

Only allow your frontend domain:

```
# ✅ CORRECT
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com

# ❌ WRONG - Too permissive
CORS_ALLOWED_ORIGINS=*
```

### Rate Limiting

Enable rate limiting in `.env`:

```
ENABLE_RATE_LIMITING=true
RATE_LIMIT_CALLS=100      # requests
RATE_LIMIT_PERIOD=60      # seconds
```

This prevents:
- Brute force attacks
- DDoS attacks
- API abuse

### Input Validation

All API endpoints validate inputs:

```python
# Example: name field limited to 100 chars
class AIEmployeeCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
```

### Authentication

Telegram Mini App uses signed authentication:

```
1. Frontend sends init_data to backend
2. Backend verifies HMAC-SHA256 signature
3. Signature verified using TELEGRAM_BOT_TOKEN
4. User authenticated only if signature matches
```

## 4. Database Security

### SQLite on VPS

For production SQLite:

```bash
# Set restrictive permissions
chmod 600 /var/lib/worklab/worklab.db
chmod 700 /var/lib/worklab

# Regular backups
/backups/worklab/worklab-20240324.db
```

### If Migrating to PostgreSQL

```
1. Use strong database password
2. Don't expose database port to internet
3. Use connection pooling (pgbouncer)
4. Regular backups to secure storage
5. Encrypt backups in transit and at rest
```

## 5. Server Security

### Firewall Rules

Only open necessary ports:

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
# Port 8000 NOT exposed - only accessed by Nginx (localhost)
```

### SSH Hardening

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Change: PermitRootLogin no

# Use SSH keys, not passwords
ssh-copy-id -i ~/.ssh/id_rsa.pub user@vps

# Reload SSH
sudo systemctl reload sshd
```

### Keep System Updated

```bash
# Weekly updates
sudo apt update && sudo apt upgrade

# Security patches
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## 6. Application Security

### Security Headers (Nginx)

Configured in `nginx.conf.example`:

```
X-Frame-Options: SAMEORIGIN           # Prevent clickjacking
X-Content-Type-Options: nosniff        # Prevent MIME sniffing
Content-Security-Policy: ...           # Control resource loading
Referrer-Policy: no-referrer-when-downgrade
```

### Logging & Monitoring

Enable request logging:

```
# Backend
LOG_REQUESTS=true
LOG_FILE_PATH=/var/log/worklab/backend.log

# Monitor logs for suspicious activity
sudo tail -f /var/log/worklab/backend.log
```

### Error Messages

Don't expose sensitive info in errors:

```python
# ❌ Bad - leaks database info
raise HTTPException(detail="User not found in database")

# ✅ Good - generic error
raise HTTPException(detail="Invalid credentials")
```

## 7. Third-Party Services

### Telegram Bot Security

- Token is secret (keep in .env only)
- Webhook URL must be HTTPS
- Verify webhook sender is Telegram (signature check)

### Stripe Integration (if used)

- Secret keys in environment only
- Webhook endpoint validates signature
- Never log sensitive payment data

## 8. Incident Response

### Security Breach Protocol

If you suspect a security breach:

1. **Immediately rotate all secrets**
   - Telegram bot token
   - Stripe keys
   - Database passwords
   - Deploy updated .env

2. **Review logs for unauthorized access**
   ```bash
   grep "ERROR\|unauthorized" /var/log/worklab/backend.log
   ```

3. **Check database for tampering**
   - Review user accounts
   - Check recent operations
   - Restore from backup if needed

4. **Notify users** (if user data was compromised)
   - Email to all affected users
   - Document incident
   - Implement fixes

### DDoS Mitigation

If experiencing DDoS:

```bash
# Temporarily block problematic IPs
sudo ufw deny from 192.168.1.100

# Use rate limiting (already configured)
# Consider using Cloudflare for larger attacks
```

## 9. Compliance & Privacy

### Data Privacy

- Comply with GDPR (if EU users)
- Comply with local privacy laws
- Implement data deletion (user account deletion)
- Privacy policy on website

### Payment Data

If handling payments:
- Never store credit card numbers
- Use Stripe (PCI-DSS compliant)
- Log payment activity

## 10. Security Checklist

- [ ] No `.env` files committed
- [ ] HTTPS enabled on all endpoints
- [ ] CORS restricted to frontend domain
- [ ] Rate limiting enabled
- [ ] Firewall configured (only 22, 80, 443)
- [ ] SSH key-based auth enabled
- [ ] Regular backups configured
- [ ] Security headers in Nginx
- [ ] Input validation on all endpoints
- [ ] Logging enabled
- [ ] Certificate auto-renewal working
- [ ] System updates scheduled
- [ ] Monitoring/alerting configured
- [ ] Incident response plan documented
- [ ] Team trained on security practices

## 11. Regular Security Audits

### Weekly
- Check logs for errors/warnings
- Verify all services running
- Test backup restoration

### Monthly  
- Review access logs for suspicious activity
- Update dependencies
- Generate security report

### Quarterly
- Full security audit
- Penetration testing (if budget allows)
- Update security policies

## 12. Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Common vulnerabilities
- [Let's Encrypt](https://letsencrypt.org/) - Free SSL certificates
- [Telegram Bot Security](https://core.telegram.org/bots#using-a-live-webhook) - Webhook verification
- [Stripe Security](https://stripe.com/en-us/guides/security) - Payment data security

## Contact

For security concerns, contact your system administrator or security team immediately.

Do NOT post security issues publicly. Responsible disclosure:
1. Document the issue
2. Test privately
3. Notify the team
4. Allow time to fix (30 days typical)
5. Coordinate disclosure

---

**Last Updated:** March 2026  
**Status:** Always under review and improvement
