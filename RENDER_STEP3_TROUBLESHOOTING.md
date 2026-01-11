# Render Step 3 Troubleshooting

## What's Not Working?

Step 3 is configuring the service settings. Let me help you figure out what's wrong.

---

## Common Issues with Step 3

### Issue 1: Build Command Not Working

**What to check:**
- Build Command should be: `cd client && npm install && npm run build`
- Make sure there are no typos
- Make sure you're in the "Build Command" field

### Issue 2: Start Command Not Working

**What to check:**
- Start Command should be: `cd server && npm start`
- Make sure there are no typos
- Make sure you're in the "Start Command" field

### Issue 3: Can't Find the Fields

**Where to find build/start commands:**
1. Scroll down on the form
2. Look for "Build Command" field
3. Look for "Start Command" field
4. They might be under "Advanced" or "Build & Deploy" section

### Issue 4: Repository Not Selected

**What to check:**
- Make sure your repository is connected
- Repository should show: `gracemazzola19-dotcom/dancescore-pro`
- If not, go back and connect GitHub first

### Issue 5: Form Won't Submit / "Create Web Service" Button Doesn't Work

**What to check:**
- Make sure all required fields are filled
- Name field is required
- Region is selected
- Build and Start commands are entered

---

## Step 3 - Exact Settings to Use

Here are the exact settings to copy/paste:

### Basic Settings:
- **Name:** `dancescore-pro`
- **Region:** Any region (choose closest to you)
- **Branch:** `main` (should auto-fill)

### Build & Deploy Section:

**Build Command:**
```
cd client && npm install && npm run build
```

**Start Command:**
```
cd server && npm start
```

### Runtime:
- **Environment:** `Node`
- **Node Version:** `18` (or `20` - either works)

---

## Alternative: Minimal Configuration

If the build/start commands are causing issues, try this simpler approach:

1. **Leave Build Command blank** (Render might auto-detect)
2. **Start Command:** `cd server && npm start`
3. Render might auto-detect the build command

**OR:**

1. **Build Command:** `npm run build` (from root)
2. **Start Command:** `npm start` (from server directory)

**But the recommended commands are:**
- Build: `cd client && npm install && npm run build`
- Start: `cd server && npm start`

---

## What Error Are You Seeing?

**Please tell me:**
1. What exactly isn't working?
   - Can't find the fields?
   - Commands not accepted?
   - Form won't submit?
   - Error message?
   
2. What error message do you see (if any)?
   - Copy/paste the exact error

3. What step are you on?
   - Configuring build/start commands?
   - Trying to create the service?
   - Something else?

---

## Quick Checklist

- [ ] Repository is connected (`gracemazzola19-dotcom/dancescore-pro`)
- [ ] Name field is filled (`dancescore-pro`)
- [ ] Region is selected
- [ ] Branch is `main`
- [ ] Build Command: `cd client && npm install && npm run build`
- [ ] Start Command: `cd server && npm start`
- [ ] Environment: `Node`
- [ ] Node Version: `18` or `20`

---

## Visual Guide

**On the Render form, you should see:**

```
Name: [dancescore-pro]
Region: [Select region]
Branch: [main]

Build Command:
[cd client && npm install && npm run build]

Start Command:
[cd server && npm start]

Environment: Node
Node Version: 18
```

---

## Still Not Working?

**Please share:**
1. What exactly isn't working?
2. What error message do you see?
3. Can you see the Build Command and Start Command fields?
4. What happens when you try to create the service?

**Once I know what's wrong, I can give you the exact fix!** 🚀
