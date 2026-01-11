# 🚀 Installation & Deployment Guide

## Current Status
- ❌ Heroku CLI: Not installed
- ❌ Homebrew: Not installed
- ✅ Code: Ready for deployment
- ✅ Build: Ready

---

## Option 1: Install Heroku CLI (Recommended)

### Step 1: Install Homebrew (macOS Package Manager)

Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

This will take a few minutes. Follow the prompts.

### Step 2: Install Heroku CLI

After Homebrew is installed:
```bash
brew tap heroku/brew
brew install heroku
```

### Step 3: Login to Heroku
```bash
heroku login
```

This will open a browser window for you to login (or create a free Heroku account).

### Step 4: Deploy
```bash
./START_DEPLOYMENT.sh
```

---

## Option 2: Install Heroku CLI Without Homebrew

### Direct Download Method

1. **Download Heroku CLI:**
   - Visit: https://devcenter.heroku.com/articles/heroku-cli
   - Download the macOS installer
   - Run the installer

2. **Login:**
   ```bash
   heroku login
   ```

3. **Deploy:**
   ```bash
   ./START_DEPLOYMENT.sh
   ```

---

## Option 3: Alternative Platforms (No CLI Needed)

If you prefer not to install Heroku CLI, you can use these platforms with web interfaces:

### Railway (Easy Setup)

1. **Sign up:** https://railway.app (free tier available)
2. **New Project** → Deploy from GitHub
3. **Connect your GitHub repository:**
   - You'll need to push your code to GitHub first
   - Railway will auto-detect your project
4. **Set Environment Variables:**
   - Add all variables from `server/.env`
   - Set `NODE_ENV=production`
   - Add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with your service account key
5. **Deploy:** Railway auto-deploys on git push

### Render (Free Tier Available)

1. **Sign up:** https://render.com
2. **New Web Service** → Connect GitHub
3. **Configure:**
   - Build Command: `cd client && npm install && npm run build`
   - Start Command: `cd server && npm start`
4. **Environment Variables:** Add all from `server/.env`
5. **Deploy:** Auto-deploys on git push

### Vercel + Railway (Frontend/Backend Split)

- **Frontend (Vercel):** Free, easy setup
- **Backend (Railway):** Free tier available

---

## Quick Start: Recommended Path

**I recommend Option 1 (Homebrew + Heroku CLI)** - It's the most straightforward and well-documented.

### Quick Commands:
```bash
# 1. Install Homebrew (one-time setup)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Heroku CLI
brew tap heroku/brew && brew install heroku

# 3. Login
heroku login

# 4. Deploy
./START_DEPLOYMENT.sh
```

---

## After Installation: Deployment Steps

Once you have Heroku CLI installed:

### 1. Run the deployment script:
```bash
./START_DEPLOYMENT.sh
```

### 2. Or manually:

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET="QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk="
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="587"
heroku config:set SMTP_USER="gracemazzola19@gmail.com"
heroku config:set SMTP_PASSWORD="saqgvejotsitugqo"
heroku config:set SMTP_FROM="gracemazzola19@gmail.com"
heroku config:set NODE_ENV="production"

# Install jq if needed
brew install jq

# Set service account key
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)"

# Deploy
git add .
git commit -m "Deploy DanceScore Pro"
git push heroku main
```

---

## Need Help?

- **Heroku CLI Installation:** https://devcenter.heroku.com/articles/heroku-cli
- **Homebrew Installation:** https://brew.sh
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs

---

**Which option would you like to use?** Let me know and I'll guide you through it step by step!
