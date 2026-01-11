# Step 2: Push to GitHub - Complete Instructions

## You Have Your Token - Let's Push!

You've created your Personal Access Token. Now let's push your code to GitHub.

---

## Step-by-Step Instructions

### Step 1: Open Terminal

1. Press `Command + Space` (opens Spotlight search)
2. Type: `Terminal`
3. Press `Enter`
4. Terminal window opens

---

### Step 2: Navigate to Your Project

In Terminal, type this and press `Enter`:

```bash
cd /Users/gracemazzola/dancescore-pro
```

**You should see:** `Graces-MacBook-Pro-205:dancescore-pro gracemazzola$`

This means you're in the right directory! ✅

---

### Step 3: Run Git Push Command

Type this and press `Enter`:

```bash
git push -u origin main
```

---

### Step 4: Enter Your Credentials

You'll be prompted for credentials:

#### Prompt 1: Username

You'll see:
```
Username for 'https://github.com':
```

**Type:** `gracemazzola19-dotcom` and press `Enter`

#### Prompt 2: Password (Use Your Token!)

You'll see:
```
Password for 'https://gracemazzola19-dotcom@github.com':
```

**Important:** This is where you use your **Personal Access Token**, NOT your password!

**What to do:**
1. **Paste your token** (the `ghp_xxxxxxxxxxxxx` code you copied)
2. Press `Enter`

**Note:** 
- When you paste, nothing will show on screen (this is normal for security)
- Just paste and press Enter
- Make sure you copied the ENTIRE token (it's long!)

---

### Step 5: Wait for Success

If it works, you'll see something like:

```
Enumerating objects: 112, done.
Counting objects: 100% (112/112), done.
Delta compression using up to 8 threads
Compressing objects: 100% (108/108), done.
Writing objects: 100% (112/112), 33372 bytes | 16.68 MiB/s, done.
Total 112 (delta 10), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (10/10), done.
To https://github.com/gracemazzola19-dotcom/dancescore-pro.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**This means SUCCESS!** ✅

---

## Complete Command Sequence

Here's everything in one place (copy and paste each command, then press Enter):

```bash
cd /Users/gracemazzola/dancescore-pro
```

Press Enter, then:

```bash
git push -u origin main
```

Press Enter, then:

**When prompted for username:**
```
gracemazzola19-dotcom
```
Press Enter

**When prompted for password:**
```
[Paste your token here - ghp_xxxxxxxxxxxxx]
```
Press Enter

---

## Troubleshooting

### "Authentication failed"

**Check:**
- Make sure username is correct: `gracemazzola19-dotcom`
- Make sure you pasted the ENTIRE token (it's long, starts with `ghp_`)
- Make sure you're using the token (not your password)

### "Token expired" or "Invalid credentials"

**Solution:**
- Create a new token at https://github.com/settings/tokens
- Make sure you checked ✅ "repo" scope
- Copy the new token
- Try again

### "Permission denied"

**Check:**
- Make sure you have access to the repository
- Make sure the repository exists on GitHub
- Make sure you're logged into the correct GitHub account

---

## What Happens After Success

Once you see the success message:

✅ Your code is now on GitHub!  
✅ You can view it at: https://github.com/gracemazzola19-dotcom/dancescore-pro  
✅ Ready for Step 3: Deploy on Railway!  

---

## Ready to Go!

**You have:**
- ✅ Personal Access Token ready
- ✅ Terminal open
- ✅ Commands ready

**Just follow the steps above!**

**If you get stuck, let me know what error message you see!** 🚀
