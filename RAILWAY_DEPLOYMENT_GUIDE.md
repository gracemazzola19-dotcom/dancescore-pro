# 🚂 Railway Deployment Guide - Step by Step

## Prerequisites

✅ Code ready for deployment  
✅ Git repository initialized  
✅ Build ready  

**You'll need:**
- GitHub account (free) - https://github.com
- Railway account (free) - https://railway.app

---

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

Since Railway deploys from GitHub, we need to push your code there first.

**1.1: Create GitHub Repository**

1. Go to https://github.com
2. Sign in (or create free account)
3. Click "+" → "New repository"
4. Repository name: `dancescore-pro` (or any name you prefer)
5. Description: "DanceScore Pro - Dance audition judging platform"
6. Choose: **Private** (recommended) or Public
7. **DO NOT** initialize with README (we already have code)
8. Click "Create repository"

**1.2: Push Your Code**

After creating the repository, GitHub will show you commands. But here's what to run:

```bash
cd /Users/gracemazzola/dancescore-pro

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dancescore-pro.git

# Push code to GitHub
git add .
git commit -m "Initial commit - DanceScore Pro ready for deployment"
git branch -M main
git push -u origin main
```

**Note:** GitHub will ask for your username and password (or personal access token).

---

### Step 2: Set Up Railway

**2.1: Create Railway Account**

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (easiest - connects automatically)
4. Authorize Railway to access your GitHub

**2.2: Create New Project**

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `dancescore-pro` repository
4. Click "Deploy Now"

Railway will start deploying automatically!

---

### Step 3: Configure Environment Variables

Railway needs your environment variables. Let's set them up.

**3.1: In Railway Dashboard**

1. Click on your project
2. Click on the service (your app)
3. Go to "Variables" tab
4. Add these variables:

**Required Variables:**

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

**3.2: Service Account Key (IMPORTANT!)**

You need to convert your Firebase service account key to an environment variable.

**Option A: Via Railway Dashboard**

1. Copy the entire content of `server/service-account-key.json`
2. In Railway Variables, add:
   - Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: Paste the entire JSON content (all on one line, or Railway handles it)

**Option B: Convert to Single Line (if needed)**

If Railway doesn't accept multi-line JSON:

```bash
# Install jq if needed: brew install jq
cat server/service-account-key.json | jq -c
```

Copy the output and paste as the value.

---

### Step 4: Configure Build Settings

Railway needs to know how to build and run your app.

**4.1: Set Root Directory**

1. In Railway, go to your service
2. Click "Settings"
3. Set "Root Directory": Leave blank (root is fine)

**4.2: Configure Build Command**

Railway should auto-detect Node.js, but let's verify:

1. Go to "Settings"
2. Build Command: Railway will auto-detect
3. Start Command: `cd server && npm start`

**Or create `railway.json` in root:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd client && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

### Step 5: Verify Deployment

**5.1: Check Deployment Status**

1. In Railway dashboard, check "Deployments" tab
2. Wait for build to complete (usually 2-5 minutes)
3. Check logs for any errors

**5.2: Get Your App URL**

1. Click on your service
2. Go to "Settings"
3. Find "Domains" section
4. Railway provides a domain like: `your-app.up.railway.app`
5. Click "Generate Domain" if needed

**5.3: Test Your App**

1. Click the URL to open your app
2. Test:
   - Landing page loads
   - Organization sign-up works
   - Login works
   - Admin dashboard accessible

---

### Step 6: Custom Domain (Optional)

Railway provides a free domain, but you can add your own:

1. In "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain
4. Follow DNS setup instructions

---

## Troubleshooting

### Build Fails

**Check logs:**
1. In Railway, go to "Deployments"
2. Click on failed deployment
3. Check error messages

**Common issues:**
- Missing environment variables
- Build command incorrect
- Node version mismatch

### App Doesn't Start

**Check:**
1. Environment variables are set correctly
2. Service account key is set
3. Start command is correct: `cd server && npm start`

### Database Errors

**Check:**
1. `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
2. JSON is valid (single line or formatted correctly)
3. Firebase project is active

### Email Not Working

**Check:**
1. SMTP credentials are correct
2. Gmail app password is correct (not regular password)
3. Test in Admin Dashboard → Settings → Security

---

## Post-Deployment Checklist

- [ ] App URL is accessible
- [ ] Landing page loads
- [ ] Organization sign-up works
- [ ] Admin login works
- [ ] Email verification works (if enabled)
- [ ] Admin dashboard accessible
- [ ] Settings page works
- [ ] Email configuration test works
- [ ] All features functional

---

## Monitoring & Maintenance

### View Logs

1. In Railway dashboard
2. Click on your service
3. Go to "Deployments" → Click deployment → View logs

### Update App

1. Make changes locally
2. Commit to git
3. Push to GitHub
4. Railway auto-deploys!

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway automatically detects the push and redeploys.

---

## Cost Monitoring

Railway shows usage in dashboard:

1. Go to your project
2. Check usage/billing section
3. Monitor $5 credit usage
4. Your usage should stay well under $5/month

---

## Next Steps

After deployment:
1. Share your Railway URL with users
2. Test all features
3. Monitor logs for first few days
4. Set up custom domain (optional)
5. Add users and start using!

---

**Ready to start? Let's begin with Step 1: GitHub setup!** 🚀
