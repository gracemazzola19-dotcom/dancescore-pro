# Quick Start: Deploy DanceScore Pro

## 🎯 Current Status

✅ **Security:** All critical issues resolved
✅ **Functionality:** All features tested and working
✅ **Email Verification:** Configured and tested
⚠️ **Warnings:** 2 minor warnings (non-critical)

## 🚀 Quick Deployment Steps

### 1. Run Security Audit
```bash
./security-audit.sh
```
Should show: ✅ All critical checks passed

### 2. Test Deployment Readiness
```bash
./test-deployment.sh
```
Should show: ✅ All critical tests passed

### 3. Build Client
```bash
cd client
npm run build
```

### 4. Choose Your Hosting Platform

#### Option A: Heroku (Recommended for Quick Start)

```bash
# Install Heroku CLI (if not installed)
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=gracemazzola19@gmail.com
heroku config:set SMTP_PASSWORD=saqg vejo tsit ugqo
heroku config:set SMTP_FROM="DanceScore Pro <gracemazzola19@gmail.com>"

# Deploy
git init
git add .
git commit -m "Initial deployment"
heroku git:remote -a your-app-name
git push heroku main
```

#### Option B: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Connect GitHub repo
2. Root directory: `client`
3. Build command: `npm run build`
4. Output directory: `build`

**Backend (Railway):**
1. Connect GitHub repo
2. Root directory: `server`
3. Start command: `npm start`
4. Add environment variables in dashboard

## 📋 Environment Variables Checklist

Make sure these are set on your hosting platform:

- [x] `NODE_ENV=production`
- [x] `JWT_SECRET` (strong secret - already generated)
- [x] `SMTP_HOST=smtp.gmail.com`
- [x] `SMTP_PORT=587`
- [x] `SMTP_USER=gracemazzola19@gmail.com`
- [x] `SMTP_PASSWORD` (your app password)
- [x] `SMTP_FROM=DanceScore Pro <gracemazzola19@gmail.com>`
- [ ] `PORT` (usually set automatically by hosting platform)

## 🔒 Security Reminders

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different credentials for production** - Don't reuse dev credentials
3. **Enable HTTPS** - Required for secure authentication
4. **Set up monitoring** - Track errors and security events

## 📚 Full Documentation

- `PRE_DEPLOYMENT_CHECKLIST.md` - Complete security & testing checklist
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `SECURITY_AUDIT.md` - Security audit details
- `DEPLOYMENT_SUMMARY.md` - Current status and action items

## ✅ Pre-Deployment Checklist

Run these commands before deploying:

```bash
# 1. Security audit
./security-audit.sh

# 2. Test deployment
./test-deployment.sh

# 3. Build client
cd client && npm run build

# 4. Check for vulnerabilities
cd server && npm audit
cd ../client && npm audit
```

## 🆘 Need Help?

1. Check server logs: `tail -f /tmp/server.log`
2. Review error messages in browser console
3. Test email configuration in Admin Dashboard
4. Verify environment variables are set correctly

---

**You're ready to deploy!** 🚀
