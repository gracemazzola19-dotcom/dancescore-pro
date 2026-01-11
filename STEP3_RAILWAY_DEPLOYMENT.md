# Step 3: Deploy on Railway 🚂

## ✅ Step 2 Complete - Code is on GitHub!

If you successfully pushed your code, you should have seen a success message. Your code is now at:
**https://github.com/gracemazzola19-dotcom/dancescore-pro**

---

## Step 3: Deploy on Railway

Now let's deploy your app to Railway so it's live on the internet!

---

## Step 3.1: Create Railway Account

1. **Go to:** https://railway.app
2. **Click:** "Start a New Project" or "Login"
3. **Sign up with GitHub** (recommended - easiest way)
   - Click "Login with GitHub"
   - Authorize Railway to access your GitHub
   - This connects Railway to your GitHub account automatically

---

## Step 3.2: Create New Project

1. **Click:** "New Project" (button in Railway dashboard)
2. **Select:** "Deploy from GitHub repo"
3. **Find and select:** `gracemazzola19-dotcom/dancescore-pro`
4. **Click:** "Deploy Now"

Railway will start building your app automatically! 🚀

---

## Step 3.3: Wait for Initial Build

- Build takes 2-5 minutes
- You can watch the logs in Railway dashboard
- Don't worry if you see errors initially - we need to add environment variables first

**What to expect:**
- Railway will detect it's a Node.js project
- It will try to build automatically
- It might fail initially (that's okay - we'll fix it with environment variables)

---

## Step 3.4: Add Environment Variables

After Railway starts building, we need to add your environment variables.

### 3.4.1: Open Variables Tab

1. In Railway dashboard, click on your project
2. Click on the service (your app - might be called "dancescore-pro" or "web")
3. Click **"Variables"** tab
4. Click **"Raw Editor"** (easier to add multiple variables)

### 3.4.2: Add These Variables

Paste these variables (one per line):

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
```

**Click "Save" or "Update"**

### 3.4.3: Add Service Account Key (IMPORTANT!)

**This is critical for your database to work!**

1. **Open:** `server/service-account-key.json` on your computer
2. **Copy the ENTIRE JSON content** (everything in the file)
3. **In Railway Variables:**
   - Click "Add Variable"
   - Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: Paste the entire JSON content
   - Click "Save"

**Note:** Railway should accept multi-line JSON. If it doesn't, you might need to convert it to a single line (but try pasting it as-is first).

**After adding variables, Railway will automatically redeploy!**

---

## Step 3.5: Configure Build Settings

Railway should auto-detect your setup, but let's verify:

1. Click on your service
2. Go to **"Settings"**
3. Check:
   - **Root Directory:** Leave blank (or `/`)
   - **Build Command:** Should auto-detect (or `cd client && npm install && npm run build`)
   - **Start Command:** Should be `cd server && npm start`

**Note:** The `railway.json` file we created should handle this automatically!

---

## Step 3.6: Get Your App URL

1. In Railway dashboard, click on your service
2. Go to **"Settings"**
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"** (if not already generated)
5. **Copy your URL** - it will look like: `dancescore-pro-production.up.railway.app`

**This is your live app URL!** 🎉

---

## Step 3.7: Test Your App

1. **Open your Railway URL** in a browser
2. **Test:**
   - ✅ Landing page loads
   - ✅ Organization sign-up works
   - ✅ Admin login works
   - ✅ Admin dashboard accessible

---

## Troubleshooting

### Build Fails

**Check logs:**
- Railway dashboard → Deployments → Click failed deployment
- Look for error messages
- Common issues:
  - Missing environment variables
  - Build command incorrect
  - Node version mismatch

### App Crashes on Start

**Check:**
- All environment variables are set
- Service account key is correct
- Check logs: Railway → Deployments → View logs

### Database Connection Errors

**Check:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- JSON is valid (check for typos)
- Firebase project is active

---

## Success Checklist

After deployment:
- [ ] App URL works
- [ ] Landing page loads
- [ ] Can create organization
- [ ] Can log in as admin
- [ ] Admin dashboard works
- [ ] Settings page accessible
- [ ] Email verification works (test in settings)

---

## Next Steps After Deployment

1. ✅ Share your Railway URL with users
2. ✅ Test all features
3. ✅ Monitor logs for first few days
4. ✅ Set up custom domain (optional)
5. ✅ Start using your app!

---

**Ready to deploy on Railway?** 

**Go to:** https://railway.app and follow the steps above! 🚀
