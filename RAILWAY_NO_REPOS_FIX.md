# Fix: Railway Says "No Repositories Found"

## Problem

Railway shows "no repositories found" when trying to deploy from GitHub.

## Common Causes & Solutions

### Solution 1: Authorize Railway GitHub App (Most Common)

Railway needs permission to access your GitHub repositories.

**Steps:**

1. **In Railway dashboard, look for:**
   - A button that says "Authorize GitHub" or "Connect GitHub"
   - Or go to: https://railway.app/account
   - Or click on your profile/settings

2. **Authorize Railway:**
   - You might see "Install Railway GitHub App" or "Authorize GitHub"
   - Click it
   - GitHub will ask you to authorize Railway
   - Choose which repositories to give access to:
     - **Option:** "All repositories" (easiest)
     - **OR:** "Only select repositories" → Choose `dancescore-pro`
   - Click "Install" or "Authorize"

3. **Try again:**
   - Go back to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Your repository should now appear!

---

### Solution 2: Check Repository Visibility

**If your repository is Private:**

1. Make sure you authorized Railway to access **private repositories**
2. When authorizing GitHub, make sure you select:
   - "All repositories" (includes private)
   - OR "Only select repositories" → Choose your repo → Make sure it includes private access

---

### Solution 3: Refresh/Reload

Sometimes Railway needs a refresh:

1. **Refresh the page** (F5 or Cmd+R)
2. **Try again:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"

---

### Solution 4: Sign Out and Sign Back In

1. **Sign out of Railway**
2. **Sign back in with GitHub**
3. **Make sure to authorize** when prompted
4. **Try again**

---

### Solution 5: Check GitHub Settings

**Make sure Railway has access:**

1. **Go to GitHub:** https://github.com/settings/installations
2. **Look for:** "Railway" in the list
3. **If you see Railway:**
   - Click on it
   - Make sure it has access to your repository
   - If not, click "Configure" and add your repository

4. **If you DON'T see Railway:**
   - Go back to Railway
   - Look for "Authorize GitHub" or "Connect GitHub"
   - Complete the authorization

---

## Step-by-Step: Authorize Railway GitHub App

### Method 1: From Railway Dashboard

1. **In Railway dashboard:**
   - Look for "Authorize GitHub" or "Connect GitHub" button
   - Or click your profile icon → Settings → Integrations

2. **Click "Authorize GitHub" or "Install Railway GitHub App"**

3. **GitHub will open:**
   - Login if needed
   - Review permissions
   - Choose repository access:
     - "All repositories" (recommended)
     - OR "Only select repositories" → Choose `dancescore-pro`

4. **Click "Install" or "Authorize"**

5. **Go back to Railway:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Your repository should now appear!

---

### Method 2: From GitHub Settings

1. **Go to:** https://github.com/settings/installations

2. **Click:** "Configure" next to Railway (if it exists)

3. **OR install Railway app:**
   - Go to: https://github.com/apps/railway
   - Click "Install"
   - Choose repository access
   - Click "Install"

4. **Go back to Railway and try again**

---

## Quick Checklist

- [ ] Signed up for Railway with GitHub
- [ ] Authorized Railway GitHub App
- [ ] Granted access to repositories (all or selected)
- [ ] Refreshed Railway page
- [ ] Repository is visible in GitHub (you can access it)

---

## Still Not Working?

**Try this:**

1. **Sign out of Railway completely**
2. **Sign back in with GitHub**
3. **When GitHub asks to authorize Railway, click "Authorize"**
4. **Make sure to grant repository access**
5. **Go to Railway → New Project → Deploy from GitHub repo**

---

## Alternative: Deploy from Template (If Still Not Working)

If repositories still don't show up:

1. **In Railway:**
   - Click "New Project"
   - Instead of "Deploy from GitHub repo"
   - Try "Deploy from public repo" (if available)
   - Or "Empty Project" and we can configure it manually

**But let's try the authorization first - that usually fixes it!**

---

**Try authorizing Railway GitHub App first, then let me know if your repository appears!** 🚀
