# 🌐 Render Deployment Guide - Step by Step

## ✅ Switching to Render

Render is a great alternative - free tier, easy setup, no CLI needed!

---

## Step 1: Create Render Account

1. **Go to:** https://render.com
2. **Click:** "Get Started for Free" or "Sign Up"
3. **Sign up with GitHub** (recommended - connects automatically)
   - Click "Sign up with GitHub"
   - Authorize Render to access your GitHub
   - This connects Render to your GitHub account

---

## Step 2: Create New Web Service

1. **In Render dashboard:**
   - Click "New +" button (top right)
   - Select "Web Service"

2. **Connect Repository:**
   - Click "Connect GitHub" (if not already connected)
   - Authorize Render to access your repositories
   - Select your repository: `gracemazzola19-dotcom/dancescore-pro`

---

## Step 3: Configure Service

Fill out the form:

### Basic Settings:

- **Name:** `dancescore-pro` (or any name you want)
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `main` (should be auto-selected)

### Build & Deploy:

- **Root Directory:** Leave blank (or `/`)
- **Runtime:** `Node`
- **Build Command:** `cd client && npm install && npm run build`
- **Start Command:** `cd server && npm start`

### Environment:

- **Environment:** `Node`
- **Node Version:** `18` (or latest)

---

## Step 4: Add Environment Variables

**Important:** Add these BEFORE clicking "Create Web Service" (or add them after in Settings)

1. **Click "Advanced"** (or scroll down to "Environment Variables")
2. **Click "Add Environment Variable"** for each:

**Add these variables:**

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

**For GOOGLE_APPLICATION_CREDENTIALS_JSON:**
- Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Value: Open `server/service-account-key.json` on your computer
- Copy the ENTIRE JSON content
- Paste it as the value

**Note:** Render accepts multi-line JSON, so you can paste it as-is.

3. **Click "Create Web Service"**

---

## Step 5: Wait for Deployment

- Render will start building automatically
- Build takes 3-5 minutes
- You can watch the logs in real-time
- Wait for "Your service is live!" message

---

## Step 6: Get Your App URL

1. **Once deployment completes:**
   - Render provides a URL automatically
   - It looks like: `dancescore-pro.onrender.com`
   - You can find it at the top of your service page

2. **Custom Domain (Optional):**
   - Go to Settings → Custom Domains
   - Add your own domain if you have one

---

## Step 7: Test Your App

1. **Open your Render URL** in a browser
2. **Test:**
   - ✅ Landing page loads
   - ✅ Organization sign-up works
   - ✅ Admin login works
   - ✅ Admin dashboard accessible

---

## Render Free Tier Details

### What You Get:
- ✅ Free tier available
- ✅ No payment method required (for free tier)
- ✅ Generous free tier
- ✅ Easy to use

### Limitations:
- ⚠️ App sleeps after 15 minutes of inactivity
- ⚠️ Wake-up takes ~10-30 seconds after sleep
- ⚠️ Free tier has resource limits

**But it's FREE and easy to use!**

---

## Troubleshooting

### Build Fails

**Check logs:**
- Render dashboard → Your service → Logs
- Look for error messages
- Common issues:
  - Missing environment variables
  - Build command incorrect
  - Node version mismatch

### App Crashes

**Check:**
- All environment variables are set
- Service account key is correct
- Check logs: Render → Your service → Logs

### Database Connection Errors

**Check:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- JSON is valid
- Firebase project is active

---

## Environment Variables (Complete List)

Make sure you add ALL of these in Render:

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS_JSON=<your service account key JSON>
```

---

## Quick Setup Summary

1. ✅ Go to https://render.com
2. ✅ Sign up with GitHub
3. ✅ New → Web Service
4. ✅ Connect your repository
5. ✅ Set build command: `cd client && npm install && npm run build`
6. ✅ Set start command: `cd server && npm start`
7. ✅ Add environment variables
8. ✅ Create Web Service
9. ✅ Wait for deployment
10. ✅ Test your app!

---

## Update Your App (After Deployment)

To update your app:

1. Make changes locally
2. Commit to git
3. Push to GitHub
4. Render automatically redeploys!

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render detects the push and redeploys automatically! ✅

---

**Ready to deploy on Render? Let's do it!** 🚀
