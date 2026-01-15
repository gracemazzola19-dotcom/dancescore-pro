# Deployment Troubleshooting Guide

## Quick Fixes for Common Deployment Failures

### Issue 1: Missing Server Dependencies

**Error:** `Cannot find module 'express'` or similar

**Fix:** Update Build Command in Render to:
```
cd client && npm install && npm run build && cd ../server && npm install
```

This ensures both client AND server dependencies are installed.

---

### Issue 2: Build Command Issues

**Current (may be wrong):**
```
cd client && npm install && npm run build
```

**Should be:**
```
cd client && npm install && npm run build && cd ../server && npm install
```

**Why:** The server needs its dependencies installed too!

---

### Issue 3: Start Command Issues

**Current (should be):**
```
cd server && npm start
```

**Verify:** This runs `node index.js` from the server directory.

---

### Issue 4: Environment Variables Missing

**Required variables:**
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `NODE_ENV=production`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (entire JSON content)

**Check:** Render Dashboard → Your Service → Environment → Verify all are set

---

### Issue 5: Firebase Initialization Fails

**Error:** `Firebase initialization failed`

**Fix:**
1. Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set
2. Verify JSON is complete (copy entire file, no truncation)
3. Check JSON is valid (no syntax errors)

---

### Issue 6: Build Timeout

**Error:** Build takes too long or times out

**Fix:**
1. Check Build Command is correct
2. Consider removing `postinstall` script if it's causing issues
3. Check logs for specific error

---

### Issue 7: Service Crashes on Start

**Error:** Service starts then immediately crashes

**Check:**
1. Look at Render logs for specific error
2. Verify all environment variables are set
3. Check Firebase credentials are valid
4. Verify PORT is set (Render sets this automatically)

---

## Step-by-Step Fix Process

### Step 1: Check Render Logs
1. Go to Render Dashboard
2. Click your service
3. Click "Logs" tab
4. Look for red error messages
5. Copy the exact error

### Step 2: Verify Build Command
1. Go to Settings → Build & Deploy
2. Build Command should be:
   ```
   cd client && npm install && npm run build && cd ../server && npm install
   ```

### Step 3: Verify Start Command
1. Go to Settings → Build & Deploy
2. Start Command should be:
   ```
   cd server && npm start
   ```

### Step 4: Check Environment Variables
1. Go to Settings → Environment
2. Verify all required variables are present
3. Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` is complete

### Step 5: Manual Redeploy
1. Go to Manual Deploy
2. Click "Deploy latest commit"
3. Watch the logs for errors

---

## Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| `Cannot find module 'express'` | Add `&& cd ../server && npm install` to Build Command |
| `Cannot find module` (any module) | Install missing dependency or fix Build Command |
| `Firebase initialization failed` | Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` |
| `Missing environment variable` | Add missing variable in Settings |
| `Build timeout` | Check Build Command, may need optimization |
| `Service crashed` | Check logs for specific error |
| `Port already in use` | Render sets PORT automatically, don't override |
| `Cannot find package.json` | Build Command path is wrong |

---

## Recommended Render Settings

### Build Command:
```
cd client && npm install && npm run build && cd ../server && npm install
```

### Start Command:
```
cd server && npm start
```

### Root Directory:
Leave blank

### Node Version:
18 or latest

---

## Testing Locally Before Deploying

Before pushing to Render, test locally:

```bash
# Install all dependencies
cd client && npm install && npm run build
cd ../server && npm install

# Test server starts
cd server && npm start
```

If this works locally, it should work on Render (assuming environment variables are set).

---

## Still Having Issues?

1. **Check the exact error** in Render logs
2. **Copy the full error message**
3. **Check which step failed:**
   - Build phase?
   - Start phase?
   - Runtime error?

4. **Common causes:**
   - Missing dependencies (fix Build Command)
   - Missing environment variables
   - Invalid Firebase credentials
   - Syntax errors in code (we've fixed these)
   - Port conflicts (unlikely on Render)

---

## Quick Checklist

Before deploying, verify:

- [ ] Build Command includes server dependency installation
- [ ] Start Command is `cd server && npm start`
- [ ] All environment variables are set
- [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` contains complete JSON
- [ ] Code has no syntax errors (we've verified this)
- [ ] `postinstall` script removed (we just fixed this)
