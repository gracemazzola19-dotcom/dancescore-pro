# Quick SMTP Setup Guide

## Fastest Way: Gmail (Recommended for Testing)

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate an App Password
1. Still in Google Account → Security
2. Click **2-Step Verification** again
3. Scroll down to **App passwords**
4. You may need to verify your password
5. Select app: **Mail**
6. Select device: **Other (Custom name)** → Type "DanceScore Pro"
7. Click **Generate**
8. **COPY THE 16-CHARACTER PASSWORD** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ You can only see this password once!
   - ⚠️ Include spaces exactly as shown OR remove all spaces (both work)

### Step 3: Create .env File
1. Navigate to your server directory:
   ```bash
   cd /Users/gracemazzola/dancescore-pro/server
   ```

2. Create a `.env` file:
   ```bash
   touch .env
   ```

3. Open the `.env` file in a text editor and add:
   ```bash
   # Gmail SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-actual-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop
   SMTP_FROM=DanceScore Pro <your-actual-email@gmail.com>
   ```

4. Replace `your-actual-email@gmail.com` with your Gmail address
5. Replace `abcd efgh ijkl mnop` with the app password you generated (keep spaces or remove them - both work)

### Step 4: Restart Your Server
```bash
# Stop the current server (Ctrl+C if running in terminal)
# Then restart:
cd /Users/gracemazzola/dancescore-pro/server
npm start
```

### Step 5: Verify It's Working
1. Check server console logs - you should see:
   ```
   ✅ Email service initialized successfully
   ```

2. Log into Admin Dashboard:
   - Go to **Settings** → **Security & Authentication Settings**
   - Click **Test Configuration** button
   - You should see: ✅ **Email service is configured correctly!**

3. Enable Email Verification:
   - In the same Security Settings page
   - Toggle **"Require Email Verification for Login"** to **ON**
   - Save the settings

4. Test Login:
   - Log out
   - Try logging in with your email
   - You should receive a verification code email!

---

## Alternative: Use MSU Email (if SMTP is available)

If MSU provides SMTP access for `@msu.edu` emails:

1. Contact MSU IT to get SMTP settings for your email
2. They'll provide:
   - SMTP Host (e.g., `smtp.msu.edu` or `outlook.office365.com`)
   - SMTP Port (usually 587 or 465)
   - Whether you need a special password/app password

3. Update your `.env` file with MSU's SMTP settings

---

## Troubleshooting

### "Email service not initialized"
- ✅ Check that `.env` file exists in `/server` directory
- ✅ Check that all SMTP_* variables are set
- ✅ Make sure there are no typos in variable names
- ✅ Restart the server after creating/updating `.env`

### "Connection test failed"
- ✅ For Gmail: Make sure you used an App Password, not your regular password
- ✅ For Gmail: Make sure 2-Step Verification is enabled
- ✅ Check that SMTP_HOST and SMTP_PORT are correct
- ✅ Try removing spaces from the app password: `abcdefghijklmnop` instead of `abcd efgh ijkl mnop`

### "Failed to send verification email"
- ✅ Check spam/junk folder
- ✅ Verify the email address in the judge/admin record matches exactly
- ✅ Check server logs for specific error messages
- ✅ Make sure your Gmail account isn't blocked or restricted

### Still not working?
1. Check server logs when you click "Test Configuration"
2. Look for specific error messages
3. Try testing from another email provider (like SendGrid free tier)

---

## Example .env File (Gmail)

```bash
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mazzolag@msu.edu
SMTP_PASSWORD=your-16-char-app-password-here
SMTP_FROM=DanceScore Pro <mazzolag@msu.edu>

# JWT Secret (already set, don't change unless needed)
JWT_SECRET=your-secret-key
```

**Note:** If using Gmail with an `@msu.edu` email that's connected to Google Workspace, the process is the same - just use your MSU email as the SMTP_USER.
