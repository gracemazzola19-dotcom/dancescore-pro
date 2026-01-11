# Gmail App Password Setup - Step by Step

## ⚠️ Common Error: "Username and Password not accepted"

This error means you're either:
1. Using your **regular Gmail password** (wrong!)
2. **2-Step Verification is not enabled**
3. Using an **old/invalid App Password**

## ✅ Correct Setup Process

### Step 1: Enable 2-Step Verification (REQUIRED)

1. Go to: https://myaccount.google.com/security
2. Sign in with `gracemazzola19@gmail.com`
3. Under "How you sign in to Google", find **"2-Step Verification"**
4. Click on it
5. If it says "Off", click **"Get Started"** and follow the prompts:
   - You'll need your phone number
   - Google will send you a verification code
   - Enter the code to verify
6. Once enabled, you'll see "2-Step Verification" is **"On"**

**⚠️ You CANNOT create App Passwords without 2-Step Verification enabled!**

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. You may need to sign in again
3. At the bottom, you'll see **"App passwords"** section
4. Click **"Select app"** dropdown → Choose **"Mail"**
5. Click **"Select device"** dropdown → Choose **"Other (Custom name)"**
6. Type: `DanceScore Pro`
7. Click **"Generate"**
8. **COPY THE 16-CHARACTER PASSWORD** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ You can only see this ONCE!
   - ⚠️ It will have spaces: `abcd efgh ijkl mnop`
   - ✅ You can use it WITH or WITHOUT spaces (both work)

### Step 3: Update .env File

Open `/Users/gracemazzola/dancescore-pro/server/.env` and update:

```bash
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**OR remove spaces:**
```bash
SMTP_PASSWORD=abcdefghijklmnop
```

Both formats work! The code will automatically remove spaces.

### Step 4: Restart Server

```bash
cd /Users/gracemazzola/dancescore-pro/server
./restart-server.sh
```

Or manually:
```bash
pkill -f "node index.js"
sleep 2
npm start
```

### Step 5: Test Again

1. Go to Admin Dashboard → Settings → Security Settings
2. Click **"Test Configuration"**
3. Should now show: ✅ **"Email service is configured correctly!"**

---

## 🔍 Troubleshooting

### "I don't see App passwords option"
- **2-Step Verification must be enabled first!**
- Go back to Step 1 and enable it

### "App passwords option is grayed out"
- Make sure 2-Step Verification is actually ON (not just enabled but not activated)
- Try refreshing the page
- Make sure you're signed in with the correct Google account

### "Still getting authentication error"
1. **Double-check you're using App Password, not regular password**
   - App Password: 16 characters, looks like `abcd efgh ijkl mnop`
   - Regular password: Your normal Gmail login password (won't work!)

2. **Generate a NEW App Password**
   - Delete the old one
   - Create a fresh one
   - Update `.env` with the new password

3. **Verify email matches**
   - `.env` has: `SMTP_USER=gracemazzola19@gmail.com`
   - App Password was generated for: `gracemazzola19@gmail.com`
   - They must match exactly!

4. **Check for typos in .env**
   - No extra spaces
   - No quotes around the password
   - Password is on the same line as `SMTP_PASSWORD=`

### "I can't enable 2-Step Verification"
- You need access to a phone number
- Google will send verification codes via:
  - Text message (SMS)
  - Phone call
  - Authenticator app
- If you can't receive codes, you may need to use a different email provider

---

## ✅ Quick Checklist

- [ ] 2-Step Verification is **ON** (not just enabled)
- [ ] App Password generated (16 characters)
- [ ] `.env` file updated with App Password (not regular password)
- [ ] Server restarted after updating `.env`
- [ ] Email in `.env` matches the account you generated App Password for

---

## 🆘 Still Not Working?

If you've done all the above and it still doesn't work:

1. **Try generating a new App Password** (delete old one first)
2. **Check server logs** for specific error messages:
   ```bash
   tail -f /tmp/server.log
   ```
3. **Verify .env file format**:
   ```bash
   cd /Users/gracemazzola/dancescore-pro/server
   cat .env | grep SMTP
   ```
   Should show:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=gracemazzola19@gmail.com
   SMTP_PASSWORD=your-16-char-password-here
   SMTP_FROM=DanceScore Pro <gracemazzola19@gmail.com>
   ```

4. **Test with a different email provider** (like SendGrid free tier) to rule out Gmail-specific issues
