# Render - Site is Live! Troubleshooting Issues

## ✅ Your Site is Deployed!

**URL:** https://dancescore-pro.onrender.com

Great job getting it deployed! Now let's fix any issues you're experiencing.

---

## Common Issues & Fixes

### Issue 1: Page Won't Load / Blank Page

**Check:**
- Are you seeing a blank page?
- Any error messages in browser console? (Press F12 → Console tab)
- Any error messages on the page?

**Possible causes:**
- Environment variables not set correctly
- Build issues
- Server not starting

**Fix:**
- Check Render logs for errors
- Verify environment variables are set
- Check browser console for JavaScript errors

---

### Issue 2: Can't Log In

**Check:**
- What happens when you try to log in?
- Any error messages?
- Does the login form appear?

**Possible causes:**
- Database connection issue
- Service account key not set correctly
- API endpoints not working

**Fix:**
- Check Render logs for errors
- Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- Check Firebase project is active

---

### Issue 3: Database Errors

**Check:**
- Any error messages about Firebase/database?
- Does the app load but crash when doing something?

**Possible causes:**
- Service account key incorrect
- Firebase project inactive
- JSON formatting issue

**Fix:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is complete
- Check JSON is valid (no typos)
- Verify Firebase project is active

---

### Issue 4: Email Not Working

**Check:**
- Can you send verification codes?
- Any errors when testing email?

**Possible causes:**
- SMTP credentials incorrect
- Email configuration not set

**Fix:**
- Verify SMTP environment variables are correct
- Check Gmail App Password is correct
- Test in Admin Dashboard → Settings → Security

---

### Issue 5: API Errors / 404 Errors

**Check:**
- Are API calls failing?
- 404 errors in browser console?

**Possible causes:**
- Server not running correctly
- Routes not working
- CORS issues

**Fix:**
- Check Render logs for errors
- Verify server is running
- Check API endpoints are correct

---

## How to Check Logs

**In Render:**
1. Go to your Render dashboard
2. Click on your service
3. Click "Logs" tab
4. Look for error messages (usually in red)
5. Copy/paste the errors

**In Browser:**
1. Open your site
2. Press F12 (opens Developer Tools)
3. Click "Console" tab
4. Look for error messages (usually in red)
5. Copy/paste the errors

---

## What Issues Are You Experiencing?

**Please tell me:**
1. **What happens?** (what are you trying to do?)
2. **What do you see?** (error message? blank page? something else?)
3. **When does it happen?** (on page load? when clicking something? when submitting?)
4. **Any error messages?** (on the page? in browser console? in Render logs?)

---

## Quick Checklist

- [ ] What page/feature is having issues?
- [ ] What error message do you see?
- [ ] When does it happen?
- [ ] Checked Render logs?
- [ ] Checked browser console?

---

**Share the specific issues you're experiencing, and I'll help you fix them!** 🚀
