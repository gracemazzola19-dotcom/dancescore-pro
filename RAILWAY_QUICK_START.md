# 🚂 Railway Quick Start Guide

## Quick Checklist

**Before we start, you need:**
- [ ] GitHub account (create at https://github.com if needed)
- [ ] Railway account (we'll create during setup)

---

## Step 1: Prepare Your Code

First, let's commit your code locally (if not already done):

```bash
cd /Users/gracemazzola/dancescore-pro
git add .
git commit -m "Ready for Railway deployment"
```

---

## Step 2: Push to GitHub

### 2.1: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click **"+"** → **"New repository"**
3. Name: `dancescore-pro`
4. Choose **Private** (recommended)
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

### 2.2: Connect and Push

After creating the repo, GitHub shows commands. Run these:

```bash
# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/dancescore-pro.git

# Push code
git branch -M main
git push -u origin main
```

**You'll be prompted for GitHub username and password (use a Personal Access Token if 2FA is enabled).**

---

## Step 3: Deploy on Railway

### 3.1: Create Railway Account

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended - connects automatically)
4. Authorize Railway to access GitHub

### 3.2: Deploy Your App

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `dancescore-pro` repository
4. Click **"Deploy Now"**

Railway will start building automatically!

### 3.3: Wait for Initial Build

- Build takes 2-5 minutes
- Watch the logs in Railway dashboard
- Don't worry about initial errors (we need to add environment variables)

---

## Step 4: Add Environment Variables

### 4.1: Open Variables Tab

1. In Railway, click on your project
2. Click on the service (your app)
3. Click **"Variables"** tab
4. Click **"Raw Editor"** (easier)

### 4.2: Add These Variables

Paste these (replace values if different):

```env
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

### 4.3: Add Service Account Key

**IMPORTANT:** You need to add your Firebase service account key.

**Option A: Copy JSON directly**
1. Open `server/service-account-key.json`
2. Copy the entire JSON content
3. In Railway Variables, add:
   - Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: Paste the entire JSON (Railway handles it)

**Option B: Single line format**
If Railway doesn't accept multi-line:

```bash
cat server/service-account-key.json | jq -c
```

Copy the output (single line) and paste as value.

**After adding variables, Railway will automatically redeploy!**

---

## Step 5: Get Your App URL

1. In Railway dashboard
2. Click on your service
3. Go to **"Settings"**
4. Scroll to **"Networking"**
5. Click **"Generate Domain"** (if not already generated)
6. Copy your URL (e.g., `dancescore-pro.up.railway.app`)

---

## Step 6: Test Your App

1. Open your Railway URL in browser
2. Test:
   - ✅ Landing page loads
   - ✅ Organization sign-up works
   - ✅ Admin login works
   - ✅ Admin dashboard accessible

---

## Troubleshooting

### Build Fails

**Check logs:**
- Railway dashboard → Deployments → Click failed deployment
- Look for error messages

**Common fixes:**
- Make sure all environment variables are set
- Verify service account key is correct
- Check build logs for specific errors

### App Crashes on Start

**Check:**
- All environment variables are set
- Service account key JSON is valid
- Check logs: Railway → Deployments → View logs

### Database Connection Errors

**Check:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- JSON is valid (check for typos)
- Firebase project is active

---

## Success Checklist

After deployment:
- [ ] App URL works
- [ ] Landing page loads
- [ ] Can create organization
- [ ] Can log in as admin
- [ ] Admin dashboard works
- [ ] Settings page accessible
- [ ] Email verification works (test in settings)

---

## Update Your App

To update after deployment:

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main
```

Railway automatically detects the push and redeploys! ✅

---

## Cost Monitoring

Railway shows usage in dashboard:
- Your usage: ~$1-3/month (within $5 free credit)
- Monitor in Railway dashboard → Usage section

---

**That's it! Ready to start?** 🚀

**Need help at any step? Just ask!**
