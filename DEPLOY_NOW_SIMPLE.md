# 🚀 Simple Deployment Steps - Copy & Paste

## Step 1: Install Homebrew (if not installed)

Open Terminal and run these commands one by one:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**You'll be prompted to:**
- Enter your password
- Press RETURN to continue
- Follow the on-screen instructions

## Step 2: Install Heroku CLI

After Homebrew is installed, run:

```bash
brew tap heroku/brew
brew install heroku
```

## Step 3: Login to Heroku

```bash
heroku login
```

This will open a browser window. Login (or create a free account).

## Step 4: Navigate to Project Directory

```bash
cd /Users/gracemazzola/dancescore-pro
```

## Step 5: Create Heroku App

```bash
heroku create dancescore-pro
```

(Or use any name you prefer - Heroku will tell you if it's taken)

## Step 6: Install jq (for JSON processing)

```bash
brew install jq
```

## Step 7: Set Environment Variables

Run these commands one by one (replace with your actual values):

```bash
heroku config:set JWT_SECRET="QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk="
heroku config:set SMTP_HOST="smtp.gmail.com"
heroku config:set SMTP_PORT="587"
heroku config:set SMTP_USER="gracemazzola19@gmail.com"
heroku config:set SMTP_PASSWORD="saqgvejotsitugqo"
heroku config:set SMTP_FROM="gracemazzola19@gmail.com"
heroku config:set NODE_ENV="production"
```

## Step 8: Set Service Account Key (IMPORTANT!)

```bash
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat server/service-account-key.json | jq -c)"
```

## Step 9: Commit and Deploy

```bash
git add .
git commit -m "Deploy DanceScore Pro"
git push heroku main
```

## Step 10: Open Your App!

```bash
heroku open
```

---

## That's It! 🎉

Your app should now be live. Check the logs if needed:

```bash
heroku logs --tail
```

---

## Alternative: Use Railway (No CLI Installation)

If you prefer not to install CLI tools:

1. **Sign up at:** https://railway.app
2. **New Project** → Deploy from GitHub
3. **Push your code to GitHub first:**
   ```bash
   # Create GitHub repo, then:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
4. **In Railway:** Connect your GitHub repo
5. **Set environment variables** in Railway dashboard
6. **Deploy!**

---

**Ready to start? Copy and paste the commands from Step 1!** 🚀
