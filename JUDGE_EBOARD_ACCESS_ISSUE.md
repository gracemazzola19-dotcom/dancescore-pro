# Troubleshooting: Can't Access Judge/E-board Page

## Problem

Can't access the judge/e-board page on your deployed site.

---

## Questions to Help Diagnose

**Please tell me:**

1. **What happens when you try to access it?**
   - What page are you on?
   - What happens when you click/try to access judge/e-board?
   - Do you see an error message?
   - Does it redirect somewhere?
   - Does nothing happen?

2. **Can you log in?**
   - Can you log in at all?
   - If yes, what role are you logging in as?
   - What happens after login?

3. **What URL are you trying to access?**
   - Is it a specific URL?
   - Are you clicking a button/link?
   - Are you trying to log in as judge/e-board?

4. **Any error messages?**
   - On the page?
   - In browser console? (Press F12 → Console tab)
   - In Render logs?

---

## Common Issues & Fixes

### Issue 1: Login Not Working

**Symptoms:**
- Can't log in as judge/e-board member
- Login form not appearing
- Login redirects to wrong page

**Check:**
- Are you on the login page?
- Can you select "E-board Member" role?
- Do login credentials work?

**Fix:**
- Check Render logs for authentication errors
- Verify environment variables are set
- Check Firebase/database connection

---

### Issue 2: Route Not Working

**Symptoms:**
- 404 error
- Page not found
- Wrong page loads

**Check:**
- What URL are you trying to access?
- Are you logged in?
- What does the URL show?

**Fix:**
- Verify routing is configured correctly
- Check if you need to be logged in first
- Check route paths in code

---

### Issue 3: Permission/Access Issue

**Symptoms:**
- Logged in but can't access judge page
- Redirected to different page
- Access denied message

**Check:**
- What role are you logged in as?
- Are you using the correct login credentials?
- Does your account have judge/e-board permissions?

**Fix:**
- Verify account has correct role
- Check authentication/authorization
- Verify database has correct user roles

---

### Issue 4: Authentication Error

**Symptoms:**
- Can't log in
- Error messages about authentication
- Token errors

**Check:**
- Render logs for authentication errors
- Browser console for errors
- Environment variables set correctly?

**Fix:**
- Check JWT_SECRET is set
- Verify database connection
- Check authentication flow

---

## Step-by-Step Debugging

### Step 1: Check What Happens

1. **Open your site:** https://dancescore-pro.onrender.com
2. **What do you see?**
   - Landing page?
   - Login page?
   - Error page?

3. **Try to access judge/e-board:**
   - What do you do? (click button? type URL? log in?)
   - What happens?
   - Any error messages?

### Step 2: Check Browser Console

1. **Open your site**
2. **Press F12** (opens Developer Tools)
3. **Click "Console" tab**
4. **Look for red error messages**
5. **Copy/paste any errors**

### Step 3: Check Render Logs

1. **Go to Render dashboard**
2. **Click your service**
3. **Click "Logs" tab**
4. **Look for error messages**
5. **Copy/paste any errors**

---

## Quick Questions

**To help me diagnose, please answer:**

1. Can you access the landing page? (https://dancescore-pro.onrender.com)
2. Can you see the login page?
3. Can you log in? If yes, what role?
4. What exactly happens when you try to access judge/e-board?
5. Any error messages? (where?)
6. What URL are you on when trying to access it?

---

**Share these details and I'll help you fix it!** 🚀
