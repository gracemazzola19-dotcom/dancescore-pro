# Fix: Can't Access Judge/E-board Page - API URL Issue

## Problem

The client is trying to connect to `http://localhost:5001` because `REACT_APP_API_URL` isn't set in Render.

**In production, the API should use the same domain as the site** (since server serves React build).

---

## Solution: Add REACT_APP_API_URL Environment Variable

### Option 1: Use Empty/Relative URL (Recommended)

Since your server serves the React build in production, API calls should use relative URLs.

**In Render, add environment variable:**
- **Key:** `REACT_APP_API_URL`
- **Value:** Leave blank (empty) or `/` 

This will make the client use relative URLs (same domain).

---

### Option 2: Use Full Render URL

**In Render, add environment variable:**
- **Key:** `REACT_APP_API_URL`
- **Value:** `https://dancescore-pro.onrender.com`

This uses the full URL.

---

## How to Add Environment Variable in Render

1. **In Render dashboard:**
   - Click on your service
   - Go to "Environment" tab (or "Variables" tab)
   - Click "Add Environment Variable"

2. **Add:**
   - **Key:** `REACT_APP_API_URL`
   - **Value:** Leave blank (empty) or `/`
   - **Apply to:** All services (or your service)

3. **Save**
   - Render will automatically redeploy

---

## After Adding the Variable

1. ✅ Add `REACT_APP_API_URL` (empty or `/`)
2. ✅ Render redeploys automatically
3. ✅ Wait for deployment to complete
4. ✅ Try accessing judge/e-board page again
5. ✅ Should work!

---

## Why This Works

- **Current:** Client tries to connect to `localhost:5001` (doesn't exist in production)
- **Fixed:** Client uses relative URLs or Render URL (same domain, works!)

---

## Alternative: Code Fix (If Environment Variable Doesn't Work)

If the environment variable doesn't work, we can update the code to use relative URLs in production, but let's try the environment variable first!

---

**Add the REACT_APP_API_URL environment variable in Render (leave it empty or use `/`) and it should fix the issue!** 🚀
