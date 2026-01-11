# 🚀 Quick Deployment Guide

## Prerequisites Check

✅ **Code Review Complete** - All checks passed  
✅ **Build Ready** - Client builds successfully  
✅ **Git Initialized** - Repository ready  
⚠️  **Heroku CLI** - Needs to be installed  

---

## Step 1: Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or visit: https://devcenter.heroku.com/articles/heroku-cli
```

Then login:
```bash
heroku login
```

---

## Step 2: Prepare Service Account Key for Deployment

Your Firebase service account key needs to be uploaded to Heroku as an environment variable:

```bash
# Convert to single-line JSON and set as environment variable
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)"
```

**Note:** If you don't have `jq` installed:
```bash
# macOS
brew install jq

# Or manually: Copy the entire JSON file content, remove all newlines, and set it
```

---

## Step 3: Run Deployment

**Option A: Use the automated script**
```bash
./deploy.sh
```

**Option B: Manual deployment**

1. **Create Heroku app:**
```bash
heroku create your-app-name
# Or let Heroku auto-generate: heroku create
```

2. **Set environment variables:**
```bash
# Get values from server/.env or set manually
heroku config:set JWT_SECRET="QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk="
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="587"
heroku config:set SMTP_USER="gracemazzola19@gmail.com"
heroku config:set SMTP_PASSWORD="saqgvejotsitugqo"
heroku config:set SMTP_FROM="gracemazzola19@gmail.com"
heroku config:set NODE_ENV="production"

# Service account key (IMPORTANT!)
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)"
```

3. **Commit and deploy:**
```bash
git add .
git commit -m "Deploy DanceScore Pro"
git push heroku main
```

---

## Step 4: Verify Deployment

```bash
# Open your app
heroku open

# Check logs
heroku logs --tail

# Check if app is running
heroku ps
```

---

## Step 5: Test Critical Features

After deployment, test:

1. ✅ Landing page loads
2. ✅ Organization sign-up works
3. ✅ Admin login works
4. ✅ Email verification sends codes
5. ✅ Admin dashboard accessible
6. ✅ Settings page works
7. ✅ Email configuration test works

---

## Troubleshooting

### Build fails:
```bash
heroku logs --tail
# Check for specific error messages
```

### App crashes:
```bash
# Check all config vars are set
heroku config

# Restart app
heroku restart
```

### Email not working:
- Verify SMTP credentials: `heroku config`
- Test in Admin Dashboard → Settings → Security → Test Configuration

### Database errors:
- Verify service account key is set: `heroku config:get GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Check Firebase project is active
- Verify Firestore is enabled in Firebase Console

---

## What's Already Done ✅

- ✅ Code reviewed and tested
- ✅ Build configuration updated
- ✅ Database adapter updated for environment variable support
- ✅ Git repository initialized
- ✅ Deployment scripts created
- ✅ Documentation ready

---

## Next Steps

1. Install Heroku CLI (if not installed)
2. Run: `./deploy.sh` OR follow manual steps above
3. Set environment variables (especially service account key)
4. Deploy: `git push heroku main`
5. Test your deployed app!

---

**Ready? Let's deploy!** 🚀
