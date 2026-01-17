# Render Deployment Checklist - Troubleshooting

## ✅ Quick Checks

### 1. Verify Service Exists in Render
- Go to https://dashboard.render.com
- Check if you see a service called `dancescore-pro` or similar
- If NO service exists → You need to create it first (see below)

### 2. Check Service Connection
- Open your service in Render dashboard
- Go to Settings → **Build & Deploy**
- Check these settings:
  - **Branch:** Should be `main`
  - **Auto-Deploy:** Should be `Yes`
  - **Root Directory:** Should be blank (empty)
  - **Build Command:** `cd client && npm install && npm run build`
  - **Start Command:** `cd server && npm start`

### 3. Verify GitHub Connection
- Settings → **Connected Accounts**
- Make sure GitHub is connected and authorized
- Verify it's connected to: `gracemazzola19-dotcom/dancescore-pro`

### 4. Check Recent Deployments
- In your service, look at the "Events" or "Deployments" tab
- Do you see any recent deployment attempts?
- If NO → Auto-deploy might be disabled

### 5. Manual Deployment Test
- Click "Manual Deploy" button
- Select "Deploy latest commit"
- This should trigger a build immediately

---

## 🆘 If No Service Exists

You need to create a Web Service in Render:

1. Go to https://dashboard.render.com
2. Click "New +" (top right)
3. Select "Web Service"
4. Connect GitHub account (if not already connected)
5. Select repository: `gracemazzola19-dotcom/dancescore-pro`
6. Fill in settings:
   - **Name:** `dancescore-pro`
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Build Command:** `cd client && npm install && npm run build`
   - **Start Command:** `cd server && npm start`
7. Add environment variables (see below)
8. Click "Create Web Service"

---

## 🔑 Required Environment Variables

Add these in Render → Your Service → Environment:

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

And `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the entire content from `server/service-account-key.json`

---

## 🔍 If Service Exists But Not Deploying

### Check 1: Auto-Deploy Status
- Settings → Build & Deploy → Auto-Deploy
- Should be set to "Yes"
- If "No", change it to "Yes" and save

### Check 2: Branch Monitoring
- Settings → Build & Deploy → Branch
- Should be `main`
- If different, change it to `main`

### Check 3: Manual Deploy
- Click "Manual Deploy" → "Deploy latest commit"
- This forces an immediate deployment
- Watch the logs to see if it starts

### Check 4: Service Status
- Check if service is "Live" or "Suspended"
- If suspended, you may need to resume it

---

## 📋 What to Look For

### In Render Dashboard:
- ✅ Service shows "Live" status
- ✅ Recent commits are visible
- ✅ "Deploy" button is available
- ✅ Build logs show recent activity

### If You See:
- ❌ "No service found" → Create new service
- ❌ "Service suspended" → Resume service
- ❌ "Build failed" → Check build logs for errors
- ❌ "No deployments" → Enable auto-deploy or trigger manual deploy

---

## 🚀 Force Deployment

If nothing else works:

1. Make a small change to trigger deployment:
   ```bash
   # This file exists to ensure Render detects changes
   ```

2. Or manually trigger in Render:
   - Click "Manual Deploy"
   - Select "Deploy latest commit"

---

## 📞 Next Steps

1. **Check Render Dashboard** - Does a service exist?
2. **Verify Settings** - Is auto-deploy enabled?
3. **Try Manual Deploy** - Does this trigger a build?
4. **Check Logs** - Are there any errors?

Tell me what you see in your Render dashboard and I can help further!
