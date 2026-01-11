# Testing Guide - Step 1: Dynamic Club Name

## ✅ Automated Tests: ALL PASSED

- ✅ Public `/api/appearance` endpoint working
- ✅ Authenticated `/api/settings` endpoint working
- ✅ Club name update successful
- ✅ Settings persistence verified

## 🧪 Manual Testing Steps

### Step 1: Change Club Name in Settings

1. **Open the application:**
   - Go to http://localhost:3000

2. **Login as Admin:**
   - Click "Judge/Admin Login"
   - Email: `gmazzola.sec@msudc.com`
   - Password: `Secretary`
   - Select "Admin" role
   - Click "Login"

3. **Navigate to Settings:**
   - In Admin Dashboard, click "Settings" tab
   - Scroll down to "Appearance & Branding" section
   - Find "Club Name" field

4. **Update Club Name:**
   - Change "Club Name" from "MSU Dance Club" to "Test Dance Club"
   - The change should save automatically (you'll see a toast notification)
   - Wait a moment for the save to complete

5. **Verify in Admin Dashboard:**
   - Look at the header - it should now say "Test Dance Club" instead of "MSU Dance Club"
   - ✅ If it updated, the dynamic club name feature is working!

### Step 2: Test Other Pages

**Test Judge Dashboard:**
1. Still logged in as admin, or logout and login as a judge
2. Go to Judge Dashboard
3. Check the header - should show "Test Dance Club"
4. ✅ If correct, feature working for Judge Dashboard!

**Test Login Page:**
1. Logout completely
2. You should see the Login page
3. Check the header - should show "Test Dance Club" (fetched from public endpoint)
4. ✅ If correct, feature working for public Login page!

**Test Dancer Registration:**
1. Go to `/register` (or click any registration link)
2. Check the header - should show "Test Dance Club"
3. ✅ If correct, feature working for public registration page!

**Test Dancer Login:**
1. Go to `/dancer-login`
2. Check the header - should show "Test Dance Club"
3. ✅ If correct, feature working for dancer login page!

### Step 3: Test PDF Generation

1. **Generate QR Code PDF:**
   - In Admin Dashboard, go to Auditions tab
   - Select an audition or create a new one
   - Click "Export QR Code PDF" or similar button
   - Download the PDF

2. **Check PDF:**
   - Open the PDF
   - Look at the header - should show "Test Dance Club" instead of "MSU Dance Club"
   - ✅ If correct, PDF generation is using dynamic club name!

### Step 4: Restore Original Name

1. **Go back to Settings:**
   - Admin Dashboard → Settings → Appearance & Branding
   - Change "Club Name" back to "MSU Dance Club"
   - Save (should auto-save)

2. **Verify everywhere:**
   - All pages should now show "MSU Dance Club" again
   - ✅ If all pages updated, the feature is working perfectly!

## 🐛 Troubleshooting

### Issue: Club name not updating in header

**Possible causes:**
1. Settings haven't saved yet - wait a few seconds
2. Browser cache - try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Component not fetching settings - check browser console for errors

**Fix:**
- Refresh the page
- Check browser console (F12) for any errors
- Verify settings were saved by checking Network tab → Settings request

### Issue: Public pages showing old club name

**Possible causes:**
1. Public endpoint caching
2. Settings not synced

**Fix:**
- Clear browser cache
- Check `/api/appearance` endpoint directly in browser console:
  ```javascript
  fetch('http://localhost:5001/api/appearance')
    .then(r => r.json())
    .then(d => console.log('Club name:', d.clubName))
  ```

### Issue: PDF still shows "MSU Dance Club"

**Possible causes:**
1. PDF cached in browser
2. Settings not updated in database

**Fix:**
- Regenerate PDF after changing club name
- Check settings in database directly

## ✅ Success Criteria

**The feature is working correctly if:**
- ✅ Club name updates immediately when changed in settings
- ✅ Admin Dashboard header shows new club name
- ✅ Judge Dashboard header shows new club name (after login)
- ✅ Login page shows new club name (public page)
- ✅ Dancer Registration shows new club name (public page)
- ✅ Dancer Login shows new club name (public page)
- ✅ PDF generation includes new club name
- ✅ All pages update when club name is changed
- ✅ Default fallback to "MSU Dance Club" if settings not found

## 📊 Test Checklist

- [ ] Changed club name in settings
- [ ] Admin Dashboard header updated
- [ ] Judge Dashboard header updated
- [ ] Login page header updated (after refresh)
- [ ] Dancer Registration header updated
- [ ] Dancer Login header updated
- [ ] PDF generation includes new club name
- [ ] Restored original club name
- [ ] All pages reverted to original name
- [ ] No console errors
- [ ] No broken functionality

## 🎉 Ready!

Once all items are checked, Step 1 is **COMPLETE** and working correctly!

You can now proceed to:
- **Step 2**: Club Management UI (create/edit clubs)
- **Step 3**: Public registration enhancement
- **Step 4**: Data export/import
