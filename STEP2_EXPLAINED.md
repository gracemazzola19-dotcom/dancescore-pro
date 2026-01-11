# Step 2 Explained Simply

## What Step 2 Does

Step 2 uploads your code from your computer to GitHub (so Railway can access it).

Think of it like:
- Your computer = Your local folder
- GitHub = Online storage (like Google Drive for code)
- Step 2 = Uploading your code to GitHub

---

## Step-by-Step (Very Simple)

### Part 1: Have You Created the GitHub Repository Yet?

**First, you need to create an empty "folder" on GitHub:**

1. **Go to:** https://github.com
2. **Sign in** (or create account if needed)
3. **Click the "+" icon** (top right corner)
4. **Click "New repository"**
5. **Name it:** `dancescore-pro` (or any name you want)
6. **Choose:** Private (recommended)
7. **IMPORTANT:** Do NOT check "Initialize with README" (leave it unchecked)
8. **Click "Create repository"**

**After creating it, GitHub will show you a page with instructions. That's when you're ready for Part 2!**

---

### Part 2: Connect Your Code to GitHub

**After you create the repository on GitHub, you'll see a page that says something like:**

```
…or push an existing repository from the command line
```

**Below that, you'll see commands. Those are what you need to run!**

**But here's what those commands do (explained simply):**

#### Command 1: Connect your folder to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/dancescore-pro.git
```

**What this does:** Tells your computer "this code belongs to this GitHub repository"

**Replace `YOUR_USERNAME` with:**
- Your actual GitHub username (the one you use to login)
- Example: If your GitHub username is "gracemazzola", it would be:
  ```bash
  git remote add origin https://github.com/gracemazzola/dancescore-pro.git
  ```

#### Command 2: Make sure you're on the "main" branch
```bash
git branch -M main
```

**What this does:** Just sets the branch name (you can run this, it's fine)

#### Command 3: Upload your code
```bash
git push -u origin main
```

**What this does:** Uploads all your code to GitHub

**You'll be asked for:**
- Username: Your GitHub username
- Password: Your GitHub password (or a Personal Access Token if you have 2FA enabled)

---

## Very Simple Version

**If you just created the GitHub repository, here's what to do:**

1. **Copy your GitHub username** (the one you use to login to GitHub)

2. **Open Terminal** (on your Mac)

3. **Run these commands one at a time** (replace `YOUR_USERNAME` with your actual GitHub username):

```bash
cd /Users/gracemazzola/dancescore-pro
git remote add origin https://github.com/YOUR_USERNAME/dancescore-pro.git
git branch -M main
git push -u origin main
```

**Example:** If your GitHub username is "gracemazzola":
```bash
cd /Users/gracemazzola/dancescore-pro
git remote add origin https://github.com/gracemazzola/dancescore-pro.git
git branch -M main
git push -u origin main
```

---

## What Happens After Step 2?

✅ Your code is now on GitHub  
✅ Railway can now access it  
✅ You can proceed to Step 3 (Deploy on Railway)

---

## Troubleshooting

### "remote origin already exists"
If you see this error, it means you already connected. Run:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/dancescore-pro.git
```

### "Authentication failed"
- Make sure your username and password are correct
- If you have 2FA enabled, you need a Personal Access Token instead of password
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
  - Use the token as your password

### "Repository not found"
- Make sure you created the repository on GitHub first
- Make sure the repository name matches exactly
- Make sure your username is correct

---

## Need Help?

**Tell me:**
1. Have you created the GitHub repository yet? (Step 1)
2. What's your GitHub username?
3. What error (if any) are you seeing?

I can help you with the exact commands for your situation! 😊
