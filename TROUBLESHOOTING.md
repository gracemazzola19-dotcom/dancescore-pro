# Site Not Working - Troubleshooting Guide

## Quick Fixes:

### 1. Clear Browser Cache
- **Chrome/Edge**: Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
- Select "Cached images and files"
- Click "Clear data"
- Refresh the page (`Cmd+R` or `Ctrl+R`)

### 2. Hard Refresh
- **Mac**: `Cmd+Shift+R`
- **Windows**: `Ctrl+Shift+R`
- This bypasses cache completely

### 3. Check Which Site You're Accessing
- **Local Development**: http://localhost:3000
- **Deployed Site**: Check your Render URL

### 4. Restart Servers (if local)
```bash
# Stop both servers (Ctrl+C in terminals)
# Then restart:
cd server && npm start
# In another terminal:
cd client && npm start
```

### 5. Check Browser Console
- Press `F12` or `Cmd+Option+I` (Mac)
- Click "Console" tab
- Look for red error messages
- Copy any errors you see

## If Using Deployed Site:
- Wait 2-5 minutes after pushing to GitHub for Render to deploy
- Check Render dashboard for deployment status
- Verify environment variables are set correctly

## Current Status:
✅ Server running on port 5001
✅ Client running on port 3000
✅ Both responding correctly
