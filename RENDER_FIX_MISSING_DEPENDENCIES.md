# Fix: Missing Server Dependencies

## Problem

**Error:** `Cannot find module 'express'`

**Cause:** The Build Command only installs client dependencies, but server dependencies also need to be installed.

---

## Solution: Update Build Command

The Build Command needs to install BOTH client AND server dependencies.

### Current Build Command (Wrong):
```
cd client && npm install && npm run build
```

### Fixed Build Command (Correct):
```
cd client && npm install && npm run build && cd ../server && npm install
```

This will:
1. Install client dependencies
2. Build the client
3. Install server dependencies

---

## How to Fix in Render

1. **In Render dashboard:**
   - Click on your service
   - Go to "Settings" tab
   - Scroll to "Build & Deploy" section
   - Find "Build Command" field

2. **Update Build Command:**
   - **Change from:** `cd client && npm install && npm run build`
   - **Change to:** `cd client && npm install && npm run build && cd ../server && npm install`

3. **Save changes**
   - Render will automatically redeploy

4. **Wait for new deployment**
   - Should work now!

---

## Alternative: Install All Dependencies First

If the above doesn't work, try this Build Command:

```
npm install && cd client && npm install && npm run build && cd ../server && npm install
```

This installs root dependencies first, then client, then builds, then server.

---

## Quick Fix Steps

1. ✅ Render dashboard → Your service → Settings
2. ✅ Find "Build Command" field
3. ✅ Change to: `cd client && npm install && npm run build && cd ../server && npm install`
4. ✅ Save
5. ✅ Wait for redeploy
6. ✅ Should work!

---

**Update the Build Command and it should fix the error!** 🚀
