# Render - Create Web Service (Not Blueprint)

## Problem

You're seeing "Blueprint" setup, but you need to create a regular "Web Service" instead.

**Blueprint** = Uses a render.yaml file (advanced)
**Web Service** = Simple deployment (what you want!)

---

## Solution: Create Web Service Instead

### Step 1: Go Back / Cancel Blueprint

1. **Cancel or go back** from the Blueprint setup
2. **Go back to the main dashboard**

### Step 2: Create Web Service (Correct Option)

1. **Click "New +" button** (top right)
2. **Select "Web Service"** (NOT "Blueprint")
3. **Connect your repository:**
   - Click "Connect GitHub" (if not already connected)
   - Select: `gracemazzola19-dotcom/dancescore-pro`

### Step 3: Configure Web Service

Fill out the form:

**Basic Settings:**
- **Name:** `dancescore-pro`
- **Branch:** `main` (should auto-fill)

**Build & Deploy:**
- **Build Command:** `cd client && npm install && npm run build`
- **Start Command:** `cd server && npm start`

**Runtime:**
- **Environment:** `Node`
- **Node Version:** `18` (or `20`)

### Step 4: Add Environment Variables

**Before clicking "Create Web Service":**

1. **Scroll down** or look for "Environment Variables" section
2. **Click "Add Environment Variable"** for each:

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

**And add:**
- Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Value: Copy entire content from `server/service-account-key.json`

3. **Click "Create Web Service"**

---

## Visual Guide: What to Click

**In Render Dashboard:**

```
Click: "New +" (top right)
  ↓
Select: "Web Service"  ← Choose this, NOT Blueprint!
  ↓
Connect Repository
  ↓
Configure Settings
  ↓
Add Environment Variables
  ↓
Create Web Service
```

---

## Difference Between Blueprint and Web Service

**Blueprint:**
- Uses render.yaml file
- More advanced
- Not what you need

**Web Service:**
- Simple form-based setup
- What you want!
- Easy to configure

---

## Quick Steps Summary

1. ✅ **Go back** from Blueprint setup
2. ✅ **Click "New +"** → **"Web Service"** (NOT Blueprint)
3. ✅ **Connect repository:** `gracemazzola19-dotcom/dancescore-pro`
4. ✅ **Fill form:**
   - Name: `dancescore-pro`
   - Build Command: `cd client && npm install && npm run build`
   - Start Command: `cd server && npm start`
5. ✅ **Add environment variables**
6. ✅ **Create Web Service**

---

**Go back and select "Web Service" instead of "Blueprint"!** 🚀
