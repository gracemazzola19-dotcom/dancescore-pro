# Update Render Deployment - Email Verification Changes

## ✅ No Render Configuration Changes Needed!

Since we only made **code changes** (no new environment variables or settings), you just need to push the updated code to GitHub. Render will automatically redeploy!

---

## Steps to Update Render

### Step 1: Commit Your Changes

In Terminal, run:

```bash
cd /Users/gracemazzola/dancescore-pro
git add .
git commit -m "Update email verification to require code only on first login and every 10th login"
```

### Step 2: Push to GitHub

```bash
git push origin main
```

### Step 3: Wait for Render to Auto-Redeploy

1. **Go to Render dashboard:** https://dashboard.render.com
2. **Click on your service:** `dancescore-pro`
3. **Click "Events" or "Logs" tab** to watch the deployment
4. **Render will automatically:**
   - Detect the push to GitHub
   - Start a new deployment
   - Build the updated code
   - Deploy the new version

### Step 4: Verify Deployment

1. **Wait for deployment to complete** (3-5 minutes)
2. **Look for "Live" status** in Render dashboard
3. **Test your site:**
   - Visit: https://dancescore-pro.onrender.com
   - Try logging in (should work as before)
   - New verification logic will be active

---

## What Changed?

✅ **Email verification logic:**
- Now requires verification code only on **first login**
- Then again on **every 10th login** (10, 20, 30, etc.)
- All other logins skip verification

✅ **DancerLogin component:**
- Added verification flow (same as judges/e-board/admins)

✅ **Backend:**
- Tracks login count for each user
- Checks login count to determine if verification is needed

---

## No Environment Variables Needed

✅ **No new environment variables required**
✅ **No Render settings to change**
✅ **Just push code and Render auto-redeploys!**

---

## Quick Commands

```bash
# 1. Go to project directory
cd /Users/gracemazzola/dancescore-pro

# 2. Add all changes
git add .

# 3. Commit
git commit -m "Update email verification to require code only on first login and every 10th login"

# 4. Push to GitHub (Render will auto-deploy)
git push origin main
```

---

## Monitor Deployment

**In Render dashboard:**
1. Go to your service
2. Click "Events" or "Logs" tab
3. Watch for:
   - "Build started"
   - "Build successful"
   - "Deploying..."
   - "Your service is live!" ✅

**That's it!** Render handles everything automatically. 🚀
