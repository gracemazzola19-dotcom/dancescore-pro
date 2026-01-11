# Render - Adding Environment Variables

## Step 4: Add Environment Variables

Environment variables are settings your app needs to work properly.

---

## Where to Add Them

In Render, scroll down on the form until you see:
- **"Environment Variables"** section
- Or **"Advanced"** section with environment variables
- Or look for **"Add Environment Variable"** button

---

## Variables to Add

Click **"Add Environment Variable"** for each of these:

### Variable 1: JWT_SECRET
- **Key:** `JWT_SECRET`
- **Value:** `QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=`

### Variable 2: SMTP_HOST
- **Key:** `SMTP_HOST`
- **Value:** `smtp.gmail.com`

### Variable 3: SMTP_PORT
- **Key:** `SMTP_PORT`
- **Value:** `587`

### Variable 4: SMTP_USER
- **Key:** `SMTP_USER`
- **Value:** `gracemazzola19@gmail.com`

### Variable 5: SMTP_PASSWORD
- **Key:** `SMTP_PASSWORD`
- **Value:** `saqgvejotsitugqo`

### Variable 6: SMTP_FROM
- **Key:** `SMTP_FROM`
- **Value:** `gracemazzola19@gmail.com`

### Variable 7: NODE_ENV
- **Key:** `NODE_ENV`
- **Value:** `production`

### Variable 8: GOOGLE_APPLICATION_CREDENTIALS_JSON (IMPORTANT!)

**This is the most important one - it's your Firebase service account key!**

- **Key:** `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **Value:** Copy the ENTIRE content from `server/service-account-key.json` on your computer

**How to get it:**
1. Open `server/service-account-key.json` on your computer (in your project folder)
2. Select ALL the text (Command+A)
3. Copy it (Command+C)
4. Paste it as the Value in Render

**Note:** Render accepts multi-line JSON, so you can paste it as-is.

---

## Step-by-Step: How to Add Each Variable

1. **Click "Add Environment Variable"** button
2. **Key field:** Type the key (e.g., `JWT_SECRET`)
3. **Value field:** Type or paste the value
4. **Click "Add"** or "Save" (depends on Render's interface)
5. **Repeat for each variable**

---

## Complete List (Copy-Paste Reference)

Add these one by one:

```
JWT_SECRET=QdvvdeQp/dOUM1Z631Z/57H0hm8umpH6Fa+C44Mb0hk=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gracemazzola19@gmail.com
SMTP_PASSWORD=saqgvejotsitugqo
SMTP_FROM=gracemazzola19@gmail.com
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste entire JSON from service-account-key.json>
```

---

## Important: Service Account Key

**The GOOGLE_APPLICATION_CREDENTIALS_JSON is critical!**

**To get it:**
1. On your computer, open: `/Users/gracemazzola/dancescore-pro/server/service-account-key.json`
2. Copy the ENTIRE JSON content (everything in the file)
3. Paste it as the Value for `GOOGLE_APPLICATION_CREDENTIALS_JSON`

**The JSON looks like:**
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  ...
}
```

**Copy ALL of it and paste it as the value!**

---

## After Adding All Variables

1. ✅ All 8 variables added
2. ✅ Double-check GOOGLE_APPLICATION_CREDENTIALS_JSON is complete
3. ✅ Scroll down or click "Create Web Service"
4. ✅ Wait for deployment (3-5 minutes)
5. ✅ Get your app URL!

---

## Quick Checklist

- [ ] JWT_SECRET added
- [ ] SMTP_HOST added
- [ ] SMTP_PORT added
- [ ] SMTP_USER added
- [ ] SMTP_PASSWORD added
- [ ] SMTP_FROM added
- [ ] NODE_ENV added
- [ ] GOOGLE_APPLICATION_CREDENTIALS_JSON added (with complete JSON)

---

**Start adding the environment variables one by one!**

**The most important one is GOOGLE_APPLICATION_CREDENTIALS_JSON - make sure to paste the complete JSON from your service-account-key.json file!** 🚀
