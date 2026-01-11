# Troubleshooting Git Push - Common Issues

## If You're Getting an Error

Please share the **exact error message** you're seeing in Terminal. Here are common issues and solutions:

---

## Common Error Messages

### 1. "Authentication failed" or "Invalid credentials"

**Possible causes:**
- Username is incorrect
- Token is incorrect or incomplete
- Token doesn't have the right permissions

**Solution:**
1. Double-check username: `gracemazzola19-dotcom`
2. Make sure you copied the ENTIRE token (it's long!)
3. Make sure you're using the token (not your password)
4. Make sure token has ✅ `repo` scope

---

### 2. "Permission denied"

**Possible causes:**
- Token doesn't have access to the repository
- Repository doesn't exist
- Wrong repository name

**Solution:**
1. Make sure repository exists: https://github.com/gracemazzola19-dotcom/dancescore-pro
2. Make sure you created the token with ✅ `repo` scope
3. Create a new token and try again

---

### 3. "Token expired" or "Bad credentials"

**Possible causes:**
- Token expired
- Token was revoked
- Wrong token

**Solution:**
1. Create a new token at https://github.com/settings/tokens
2. Make sure expiration is set (90 days or No expiration)
3. Copy the new token
4. Try again with the new token

---

### 4. "Repository not found"

**Possible causes:**
- Repository doesn't exist
- Wrong repository name
- Wrong username

**Solution:**
1. Check repository exists: https://github.com/gracemazzola19-dotcom/dancescore-pro
2. Make sure username is correct: `gracemazzola19-dotcom`
3. Make sure repository name is exactly: `dancescore-pro`

---

### 5. "remote: Support for password authentication was removed"

**Cause:**
- You tried to use your password instead of a token

**Solution:**
- Use a Personal Access Token (not your password)
- Create one at: https://github.com/settings/tokens

---

## Step-by-Step: Double-Check Everything

### 1. Verify Your Token

- Go to: https://github.com/settings/tokens
- Make sure your token exists
- Make sure it has ✅ `repo` scope
- If not, create a new one

### 2. Verify Repository Exists

- Go to: https://github.com/gracemazzola19-dotcom/dancescore-pro
- Make sure it exists
- Make sure you can access it

### 3. Try Again

Run these commands in Terminal:

```bash
cd /Users/gracemazzola/dancescore-pro
git push -u origin main
```

**When prompted:**
- Username: `gracemazzola19-dotcom`
- Password: [Paste your token - the `ghp_xxxxx` code]

---

## Create a New Token (If Needed)

If your token isn't working, create a new one:

1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Name:** `DanceScore Pro`
4. **Expiration:** Choose `90 days` or `No expiration`
5. **Scopes:** Check ✅ `repo`
6. **Click:** "Generate token"
7. **COPY THE TOKEN** (ghp_xxxxxxxxxxxxx)
8. **Use this new token** when prompted for password

---

## Still Not Working?

**Please share:**
1. The exact error message from Terminal (copy and paste it)
2. What you see when you run `git push -u origin main`

**I can help you fix it once I see the error message!** 🚀
