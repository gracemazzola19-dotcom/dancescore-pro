# 🔑 GitHub Personal Access Token Setup

## Why You Need This

GitHub no longer accepts passwords for Git operations. You need a **Personal Access Token** instead.

This is a one-time setup that takes about 2 minutes.

---

## Step 1: Create Personal Access Token

### 1.1: Go to GitHub Settings

1. Go to: https://github.com/settings/tokens
2. Make sure you're logged in to GitHub
3. You should see "Personal access tokens" page

### 1.2: Generate New Token

1. Click **"Generate new token"** dropdown
2. Select **"Generate new token (classic)"**
3. You might be asked to enter your password again (for security)

### 1.3: Configure Token

**Note:**
- Give it a name: `DanceScore Pro` (or any name you want)
- Expiration: Choose how long it should work
  - **Recommended:** `90 days` or `No expiration` (for convenience)
- Select scopes: Check these boxes:
  - ✅ **`repo`** (Full control of private repositories)
    - This includes all the sub-items automatically

### 1.4: Generate Token

1. Scroll down
2. Click **"Generate token"** button (green button at bottom)
3. **IMPORTANT:** Copy the token immediately! It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again!
   - Save it somewhere safe temporarily

---

## Step 2: Use Token as Password

### 2.1: Try Push Again

In Terminal, run:
```bash
git push -u origin main
```

### 2.2: When Prompted

**Username:**
```
Username for 'https://github.com':
```
Type: `gracemazzola19-dotcom` and press Enter

**Password:**
```
Password for 'https://gracemazzola19-dotcom@github.com':
```
**Paste your Personal Access Token** (the `ghp_xxxxx` code you copied) and press Enter

**Note:** It won't show anything as you paste (this is normal for security)

---

## Success!

If it works, you'll see:
```
Enumerating objects: 112, done.
Writing objects: 100% (112/112), done.
To https://github.com/gracemazzola19-dotcom/dancescore-pro.git
 * [new branch]      main -> main
```

✅ **Your code is now on GitHub!**

---

## Visual Guide

### Creating Token:

```
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

1. Click "Generate new token" → "Generate new token (classic)"
2. Name: "DanceScore Pro"
3. Expiration: Choose (90 days or No expiration)
4. Scopes: Check ✅ "repo"
5. Click "Generate token" (green button)
6. COPY THE TOKEN (ghp_xxxxxxxxxxxxx)
```

### Using Token:

```
Terminal:
$ git push -u origin main
Username: gracemazzola19-dotcom
Password: [Paste token here - won't show on screen]
```

---

## Troubleshooting

### "Token expired"
- Create a new token
- Use it as password

### "Permission denied"
- Make sure you checked ✅ "repo" scope
- Make sure you copied the entire token

### "Invalid credentials"
- Double-check username: `gracemazzola19-dotcom`
- Make sure you're using the token (not your password)
- Make sure you copied the entire token correctly

---

## Save Your Token (Optional)

You can save your token so you don't have to enter it every time:

**Option 1: Git Credential Helper (Recommended)**
```bash
git config --global credential.helper osxkeychain
```

This saves your token in your Mac's keychain.

**Option 2: Remember for this session only**
- Token is remembered for current terminal session
- You'll need to enter it again if you open a new terminal

---

## Quick Steps Summary

1. ✅ Go to: https://github.com/settings/tokens
2. ✅ Click "Generate new token" → "Generate new token (classic)"
3. ✅ Name: "DanceScore Pro"
4. ✅ Check ✅ "repo" scope
5. ✅ Click "Generate token"
6. ✅ **COPY THE TOKEN** (ghp_xxxxxxxxxxxxx)
7. ✅ Run: `git push -u origin main`
8. ✅ Username: `gracemazzola19-dotcom`
9. ✅ Password: **Paste your token** (not your password!)

---

**Create the token now, then try pushing again!** 🚀
