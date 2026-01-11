# Render - Correct Settings to Use

## ✅ Perfect! You're in the Right Place Now!

You're in the Web Service setup (correct!). Here's what to fill in:

---

## Settings to Use

### Language:
**Keep:** `Node` ✅ (already correct)

### Branch:
**Keep:** `main` ✅ (already correct)

### Region:
**Keep:** `Virginia (US East)` ✅ (this is fine, or choose any region closest to you)

### Root Directory:
**Leave blank** ✅ (don't fill this in - it's optional)

### Build Command:
**Change to:** 
```
cd client && npm install && npm run build
```

**Replace:** The current `yarn install` with the command above

### Start Command:
**Change to:**
```
cd server && npm start
```

**Replace:** The current `node server/index.js` with the command above

---

## Step-by-Step: What to Change

1. **Language:** Keep as `Node` ✅

2. **Branch:** Keep as `main` ✅

3. **Region:** Keep as `Virginia (US East)` ✅ (or choose another if you prefer)

4. **Root Directory:** Leave blank ✅

5. **Build Command:** 
   - **Delete** `yarn install`
   - **Type:** `cd client && npm install && npm run build`

6. **Start Command:**
   - **Delete** `node server/index.js`
   - **Type:** `cd server && npm start`

7. **Continue** - Scroll down to find "Environment Variables" section

8. **Add Environment Variables** (next step)

9. **Click "Create Web Service"**

---

## Visual Guide

**What you should see after changes:**

```
Language: Node ✅

Branch: main ✅

Region: Virginia (US East) ✅

Root Directory: [leave blank] ✅

Build Command:
cd client && npm install && npm run build

Start Command:
cd server && npm start
```

---

## Important Changes

**Change these two commands:**

1. **Build Command:** Change from `yarn install` to:
   ```
   cd client && npm install && npm run build
   ```

2. **Start Command:** Change from `node server/index.js` to:
   ```
   cd server && npm start
   ```

---

## After Filling These In

1. ✅ Language: Node
2. ✅ Branch: main
3. ✅ Region: Virginia (or your choice)
4. ✅ Root Directory: Leave blank
5. ✅ Build Command: `cd client && npm install && npm run build`
6. ✅ Start Command: `cd server && npm start`

**Then:**
- Scroll down
- Add environment variables
- Create Web Service

---

**Change those two commands and you're good to go!** 🚀
