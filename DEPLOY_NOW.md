# 🚀 Deploy DanceScore Pro - Step by Step Guide

## Quick Deployment Options

### Option 1: Heroku (Recommended - Easiest)

#### Step 1: Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Login to Heroku
```bash
heroku login
```

#### Step 3: Run Deployment Script
```bash
./deploy.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Build the client
- ✅ Create/connect to Heroku app
- ✅ Set environment variables
- ✅ Deploy your app

#### Step 4: Manual Environment Variables Setup

If the script doesn't set everything, manually set:

```bash
# Get your Heroku app name first
heroku apps

# Set environment variables (replace YOUR_APP_NAME)
heroku config:set JWT_SECRET="QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=" -a YOUR_APP_NAME
heroku config:set SMTP_HOST="smtp.gmail.com" -a YOUR_APP_NAME
heroku config:set SMTP_PORT="587" -a YOUR_APP_NAME
heroku config:set SMTP_USER="gracemazzola19@gmail.com" -a YOUR_APP_NAME
heroku config:set SMTP_PASSWORD="saqgvejotsitugqo" -a YOUR_APP_NAME
heroku config:set SMTP_FROM="gracemazzola19@gmail.com" -a YOUR_APP_NAME
heroku config:set NODE_ENV="production" -a YOUR_APP_NAME
```

#### Step 5: Upload Service Account Key

**Option A: Convert to Environment Variable (Recommended)**
```bash
# Install jq if needed: brew install jq
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)" -a YOUR_APP_NAME
```

**Option B: Modify Code to Read from Config Var**

Update `server/database-adapter.js` to check for environment variable first.

#### Step 6: Deploy
```bash
git add .
git commit -m "Ready for deployment"
git push heroku main
```

#### Step 7: Verify Deployment
```bash
# Open your app
heroku open

# Check logs
heroku logs --tail

# Check app status
heroku ps
```

---

### Option 2: Railway (Alternative - Easy Setup)

1. **Sign up at:** https://railway.app
2. **New Project** → Deploy from GitHub
3. **Add Environment Variables:**
   - Add all variables from `server/.env`
   - Set `NODE_ENV=production`
4. **Deploy:** Railway will auto-deploy on git push

---

### Option 3: Render (Alternative)

1. **Sign up at:** https://render.com
2. **New Web Service** → Connect GitHub
3. **Settings:**
   - Build Command: `cd client && npm install && npm run build`
   - Start Command: `cd server && npm start`
4. **Environment Variables:** Add all from `server/.env`
5. **Deploy**

---

## Manual Deployment Steps (If Scripts Don't Work)

### 1. Build Client
```bash
cd client
npm install
npm run build
cd ..
```

### 2. Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial commit"
```

### 3. Create Heroku App
```bash
heroku create your-app-name
```

### 4. Set Environment Variables
```bash
heroku config:set JWT_SECRET="your-secret"
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="587"
heroku config:set SMTP_USER="your-email@gmail.com"
heroku config:set SMTP_PASSWORD="your-app-password"
heroku config:set SMTP_FROM="your-email@gmail.com"
heroku config:set NODE_ENV="production"
```

### 5. Handle Service Account Key

**Best Option:** Update `server/database-adapter.js` to read from environment variable:

```javascript
// At the top of database-adapter.js
const admin = require('firebase-admin');

let firebaseDb = null;
try {
  if (!admin.apps.length) {
    // Try to read from environment variable first
    let serviceAccount;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } else {
      // Fallback to file
      serviceAccount = require('./service-account-key.json');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  firebaseDb = admin.firestore();
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.log('❌ Firebase initialization failed:', error.message);
  throw error;
}
```

Then set it on Heroku:
```bash
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)"
```

### 6. Deploy
```bash
git push heroku main
```

---

## Post-Deployment Testing

After deployment, test:

1. **Landing Page:**
   - Visit your app URL
   - Should see "DanceScore Pro" landing page

2. **Organization Sign-up:**
   - Click "Sign Up"
   - Create a new organization
   - Verify it works

3. **Login:**
   - Use your existing admin credentials
   - Test email verification (if enabled)

4. **Admin Dashboard:**
   - Access all admin features
   - Test settings page
   - Test email configuration

5. **Check Logs:**
   ```bash
   heroku logs --tail
   ```
   Look for:
   - ✅ Server running on port...
   - ✅ Firebase initialized successfully
   - ✅ Email service initialized
   - ❌ Any error messages

---

## Troubleshooting

### Build Fails
- Check Node version: `heroku config:set NODE_ENGINE="18.x"`
- Check logs: `heroku logs --tail`

### App Crashes
- Check logs: `heroku logs --tail`
- Verify all environment variables are set: `heroku config`
- Check service account key is configured

### Email Not Working
- Verify SMTP credentials: `heroku config`
- Test in Admin Dashboard → Settings → Security
- Check email service logs

### Database Errors
- Verify Firebase service account key
- Check Firebase project is active
- Verify Firestore is enabled

---

## Quick Commands Reference

```bash
# View logs
heroku logs --tail

# Check config
heroku config

# Restart app
heroku restart

# Open app
heroku open

# Check app status
heroku ps

# Scale dynos (if needed)
heroku ps:scale web=1

# View app info
heroku info
```

---

## Need Help?

1. Check logs: `heroku logs --tail`
2. Review error messages
3. Verify environment variables: `heroku config`
4. Test locally first: `npm run dev`
5. Check deployment documentation: `DEPLOYMENT_GUIDE.md`

---

**Ready to deploy? Run:** `./deploy.sh`
