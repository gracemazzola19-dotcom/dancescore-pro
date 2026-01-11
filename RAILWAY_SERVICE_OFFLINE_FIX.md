# Fix: Railway Service is Offline

## Problem

Railway shows "Service is offline" - this means your app crashed or failed to start.

## Common Causes

1. **Missing environment variables** (especially service account key)
2. **Build failed**
3. **App crashed on startup**
4. **Database connection error**

---

## Step 1: Check the Logs

**This is the most important step - the logs will tell us what's wrong!**

1. **In Railway dashboard:**
   - Click on your project
   - Click on the service (your app)
   - Click **"Deployments"** tab (or "Logs" tab)
   - Click on the latest deployment
   - **Look at the logs** - they'll show error messages

**What to look for:**
- Error messages (usually in red)
- "Failed to start"
- "Missing environment variable"
- "Database connection failed"
- Any other error messages

---

## Step 2: Common Fixes

### Fix 1: Missing Environment Variables

**If logs say "Missing environment variable" or "undefined":**

You need to add environment variables:

1. **Click on your service**
2. **Go to "Variables" tab**
3. **Add these variables:**

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

**For GOOGLE_APPLICATION_CREDENTIALS_JSON:**
- Open `server/service-account-key.json` on your computer
- Copy the ENTIRE JSON content
- Paste it as the value

4. **Click "Save" or "Update"**
5. **Railway will automatically redeploy**

---

### Fix 2: Service Account Key Format

**If logs mention Firebase/database errors:**

The service account key might not be formatted correctly.

**Try this:**
1. Open `server/service-account-key.json` on your computer
2. Copy the entire JSON (all of it)
3. In Railway Variables, make sure `GOOGLE_APPLICATION_CREDENTIALS_JSON` value is the complete JSON
4. Save and redeploy

**If Railway doesn't accept multi-line JSON:**
- You might need to convert it to a single line
- Or check Railway's documentation for JSON variable format

---

### Fix 3: Build Failed

**If logs show build errors:**

1. **Check the build logs:**
   - Look for errors during "npm install" or "npm run build"
   - Common issues: Missing dependencies, Node version mismatch

2. **Check build settings:**
   - Go to Settings
   - Verify build command
   - Verify Node version

---

### Fix 4: Start Command Wrong

**If logs show "command not found" or startup errors:**

1. **Check Settings:**
   - Start Command should be: `cd server && npm start`
   - Or: `npm start` (if in server directory)

2. **Verify:**
   - Root directory is correct
   - Start command matches your package.json

---

## Step 3: Check Logs - What to Look For

**Open the logs and look for these specific errors:**

### Error: "Firebase initialization failed"
**Fix:** Service account key is missing or incorrect
- Add `GOOGLE_APPLICATION_CREDENTIALS_JSON` variable
- Make sure JSON is complete and valid

### Error: "Missing environment variable"
**Fix:** Add the missing variable
- Check which variable is missing
- Add it to Railway Variables

### Error: "Cannot find module"
**Fix:** Build failed or dependencies missing
- Check build logs
- Make sure all dependencies are installed

### Error: "Port already in use" or "EADDRINUSE"
**Fix:** Port configuration issue (Railway should handle this automatically)
- Check Railway settings
- Make sure PORT environment variable is set (Railway sets this automatically)

### Error: "Database connection failed"
**Fix:** Service account key issue
- Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- Check Firebase project is active

---

## Step-by-Step Troubleshooting

### 1. Check Logs First!

1. Railway dashboard → Your project → Your service
2. Click "Deployments" or "Logs"
3. Click latest deployment
4. **Read the error messages**
5. **Copy/paste the error here if you need help!**

### 2. Add Environment Variables

1. Service → "Variables" tab
2. Add all required variables (see Fix 1 above)
3. **Make sure GOOGLE_APPLICATION_CREDENTIALS_JSON is set!**
4. Save

### 3. Redeploy

1. After adding variables, Railway should auto-redeploy
2. If not, go to Deployments → Click "Redeploy"
3. Watch the logs

### 4. Check Again

1. Wait for deployment to complete
2. Check if service is online
3. If still offline, check logs again

---

## Quick Checklist

- [ ] Checked logs for error messages
- [ ] Added all environment variables
- [ ] Added GOOGLE_APPLICATION_CREDENTIALS_JSON (service account key)
- [ ] Saved variables
- [ ] Waited for redeploy
- [ ] Checked logs again

---

## Still Not Working?

**Please share:**
1. **The error message from the logs** (copy and paste it)
2. **Which step you're on** (variables added? build successful?)
3. **What the logs say**

**I can help you fix the specific error once I see the log messages!** 🚀
