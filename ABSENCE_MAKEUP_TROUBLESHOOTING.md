# Absence Request & Make-Up Submissions Tab - Troubleshooting

## Common Issues & Fixes

### Issue 1: Tab Shows "No Data" or Empty

**Possible Causes:**
- No absence requests or make-up submissions exist yet
- Firestore index missing (most common)
- API error (check browser console)

**Fix:**
1. Check browser console (F12 → Console tab)
2. Look for errors mentioning "index" or "orderBy"
3. If you see index errors, we need to create Firestore indexes

---

### Issue 2: Firestore Index Error

**Error Message:**
```
The query requires an index. You can create it here: [link]
```

**Fix:**
1. Click the link in the error message
2. It will open Firebase Console
3. Click "Create Index"
4. Wait for index to build (1-2 minutes)
5. Refresh the page

**Or manually create indexes:**
- Collection: `absence_requests`
  - Fields: `clubId` (Ascending), `submittedAt` (Descending)
- Collection: `make_up_submissions`
  - Fields: `clubId` (Ascending), `submittedAt` (Descending)

---

### Issue 3: Tab Not Loading / Spinning Forever

**Possible Causes:**
- API endpoint error
- Network timeout
- Authentication issue

**Fix:**
1. Check browser console for errors
2. Check Network tab (F12 → Network)
3. Look for failed requests to `/api/absence-requests` or `/api/make-up-submissions`
4. Check if you're logged in

---

### Issue 4: Buttons Not Working

**Possible Causes:**
- JavaScript error
- API endpoint error
- Missing data

**Fix:**
1. Check browser console for errors
2. Try clicking button and watch console
3. Check Network tab for failed requests

---

## How to Diagnose

### Step 1: Check Browser Console
1. Press **F12** (or right-click → Inspect)
2. Click **Console** tab
3. Look for **red error messages**
4. Copy and share the errors

### Step 2: Check Network Tab
1. Press **F12** → **Network** tab
2. Click the **Absence Requests** or **Make-Up Submissions** tab
3. Look for requests to:
   - `/api/absence-requests`
   - `/api/make-up-submissions`
4. Click on the request
5. Check:
   - Status code (should be 200)
   - Response (should show data or error)

### Step 3: Check Render Logs
1. Go to Render dashboard
2. Click your service
3. Click **Logs** tab
4. Look for errors related to:
   - `absence_requests`
   - `make_up_submissions`
   - `orderBy`
   - `index`

---

## Quick Checks

✅ **Are you logged in as admin?**
- Tab only shows for admins

✅ **Do you have any absence requests?**
- If none exist, tab will show "No Absence Requests"

✅ **Do you have any make-up submissions?**
- If none exist, tab will show "No Make-Up Submissions"

✅ **Is the tab visible?**
- Should be in the tab navigation at top

---

## Most Likely Issue: Firestore Index

The queries use `.orderBy('submittedAt', 'desc')` which requires a Firestore index.

**If you see index errors:**
1. Click the link in the error
2. Create the index
3. Wait for it to build
4. Refresh page

**Or tell me and I can help create the indexes!**

---

**Please share:**
1. What specific issue you're seeing
2. Any error messages from browser console
3. What happens when you click the tab
