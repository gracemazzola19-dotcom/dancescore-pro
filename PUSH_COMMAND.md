# How to Push to GitHub - Run This in Your Terminal

## The Command to Run

**Open Terminal on your Mac** and run:

```bash
cd /Users/gracemazzola/dancescore-pro
git push -u origin main
```

---

## Step-by-Step

### 1. Open Terminal
- Press `Command + Space`
- Type: `Terminal`
- Press Enter

### 2. Navigate to Your Project
Type this and press Enter:
```bash
cd /Users/gracemazzola/dancescore-pro
```

### 3. Push to GitHub
Type this and press Enter:
```bash
git push -u origin main
```

### 4. Enter Credentials

You'll be prompted for:

**Username:**
```
Username for 'https://github.com':
```
Type: `gracemazzola19-dotcom` and press Enter

**Password:**
```
Password for 'https://gracemazzola19-dotcom@github.com':
```
Type: Your GitHub password (or Personal Access Token if you have 2FA enabled)

**Note:** When typing the password, it won't show on screen (this is normal for security)

---

## If You Have 2FA Enabled

If you have Two-Factor Authentication (2FA) enabled on GitHub, you **cannot** use your regular password. You need a **Personal Access Token** instead.

### Create Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "DanceScore Pro"
4. Select scopes: Check `repo` (full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)
7. Use this token as your password when prompted

---

## What Success Looks Like

After entering credentials, you should see:

```
Enumerating objects: 112, done.
Counting objects: 100% (112/112), done.
Delta compression using up to 8 threads
Compressing objects: 100% (108/108), done.
Writing objects: 100% (112/112), done.
Total 112 (delta 10), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (10/10), done.
To https://github.com/gracemazzola19-dotcom/dancescore-pro.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

This means **success!** ✅

---

## What to Do Next

Once the push succeeds:

1. ✅ Your code is now on GitHub
2. ✅ You can view it at: https://github.com/gracemazzola19-dotcom/dancescore-pro
3. ✅ Ready for Step 3: Deploy on Railway!

---

## Troubleshooting

### "Authentication failed"
- Make sure username is correct: `gracemazzola19-dotcom`
- If you have 2FA, use Personal Access Token (not password)
- Make sure token has `repo` scope

### "Repository not found"
- Make sure repository exists on GitHub
- Check repository name matches: `dancescore-pro`
- Make sure you have access to the repository

### "Permission denied"
- Check your GitHub credentials
- Make sure you have access to the repository
- If private repo, make sure you're logged in

---

**Run the command in Terminal and let me know how it goes!** 🚀
