# Quick Testing Checklist - Multi-Tenant Migration

## ✅ Pre-Test Verification (COMPLETE)

- ✅ Migration script executed successfully
- ✅ All 199 records have clubId
- ✅ Default club "msu-dance-club" created
- ✅ Database tests passed (7/7)
- ✅ All endpoints updated for multi-tenant support

## 🚀 Starting the Application

### Step 1: Start Development Servers

```bash
# From project root
npm run dev
```

This will start:
- **Backend server**: http://localhost:5001
- **Frontend app**: http://localhost:3000

### Step 2: Open the Application

1. Open browser to: http://localhost:3000
2. Check browser console (F12) for any errors
3. Check Network tab for API calls

## 🧪 Critical Tests (Do These First)

### Test 1: Login & Verify clubId in Token

**Judge Login:**
1. Go to http://localhost:3000
2. Click "Judge/Admin Login"
3. Login with judge credentials
4. Open browser console (F12) → Application → Local Storage
5. Check `token` - decode it at https://jwt.io or check in console:
   ```javascript
   const token = localStorage.getItem('token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('clubId:', payload.clubId); // Should be "msu-dance-club"
   ```
6. ✅ **Expected:** Token contains `clubId: "msu-dance-club"`

**What to check:**
- ✅ Login successful
- ✅ Token includes clubId
- ✅ User object includes clubId
- ✅ No console errors

### Test 2: View Judges (Verify clubId Filtering)

1. Login as admin/judge
2. Go to Admin Dashboard → Judges tab
3. Check browser console → Network tab
4. Look for GET /api/judges request
5. Check response - should only include judges with clubId: "msu-dance-club"
6. ✅ **Expected:** Only see judges from your club

**What to check:**
- ✅ Judges list loads
- ✅ Network request includes clubId filter
- ✅ Response only includes your club's judges
- ✅ No 403 Forbidden errors

### Test 3: Create New Judge (Verify clubId Assignment)

1. In Admin Dashboard → Judges tab
2. Click "Add Judge"
3. Fill in form and submit
4. Check browser console → Network tab
5. Look for POST /api/judges request
6. Check response - should include `clubId: "msu-dance-club"`
7. ✅ **Expected:** New judge has clubId set

**What to check:**
- ✅ Judge created successfully
- ✅ Response includes clubId
- ✅ New judge appears in list
- ✅ Can login with new judge credentials

### Test 4: Create Audition (Verify clubId Assignment)

1. In Admin Dashboard → Auditions tab
2. Click "Create Audition"
3. Fill in form and submit
4. Check Network tab for POST /api/auditions
5. Check response - should include `clubId: "msu-dance-club"`
6. ✅ **Expected:** New audition has clubId set

**What to check:**
- ✅ Audition created successfully
- ✅ Response includes clubId
- ✅ Audition appears in list
- ✅ Can view audition details

### Test 5: Create Dancer (Verify clubId Assignment)

1. Go to Audition Details
2. Add a dancer
3. Check Network tab for POST /api/dancers
4. Check response - should include `clubId: "msu-dance-club"`
5. ✅ **Expected:** New dancer has clubId set

**What to check:**
- ✅ Dancer created successfully
- ✅ Response includes clubId
- ✅ Dancer appears in list
- ✅ Can view dancer details

### Test 6: Submit Scores (Verify clubId Assignment)

1. Go to Judge Dashboard
2. Select a group
3. Submit scores for a dancer
4. Check Network tab for POST /api/scores
5. Check response - should include `clubId: "msu-dance-club"`
6. ✅ **Expected:** Score has clubId set

**What to check:**
- ✅ Score submitted successfully
- ✅ Response includes clubId
- ✅ Score appears in results
- ✅ Average calculated correctly

### Test 7: View Results (Verify clubId Filtering)

1. Go to Results page (or Admin Dashboard → Results)
2. Check Network tab for GET /api/results
3. Check response - should only include dancers/scores from your club
4. ✅ **Expected:** Only see your club's data

**What to check:**
- ✅ Results load correctly
- ✅ Network request filters by clubId
- ✅ Only your club's data appears
- ✅ Calculations are correct

## 🔍 Detailed Testing

### Test Settings Per Club

1. Go to Admin Dashboard → Settings
2. Update any setting (e.g., club name, colors)
3. Save settings
4. Check Network tab for PUT /api/settings
5. Check response - should include `clubId: "msu-dance-club"`
6. Logout and login again
7. ✅ **Expected:** Settings persist and are club-specific

### Test Videos Per Club

1. Go to Audition Details → Videos tab
2. Record/upload a video
3. Check Network tab for POST /api/auditions/:id/videos
4. Check response - should include `clubId: "msu-dance-club"`
5. View videos list
6. Check Network tab for GET /api/auditions/:id/videos
7. ✅ **Expected:** Only see videos from your club

### Test Attendance Per Club

1. Go to Admin Dashboard → Attendance
2. Create an attendance event
3. Check Network tab - should include `clubId: "msu-dance-club"`
4. Create attendance records
5. View attendance summary
6. ✅ **Expected:** Only see attendance from your club

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot read property 'clubId' of undefined"

**Symptom:** Error in console about clubId
**Fix:** 
- Logout and login again to get new token with clubId
- Check that authenticateToken middleware is working

### Issue 2: 403 Forbidden errors

**Symptom:** Getting access denied errors
**Possible causes:**
- clubId mismatch between token and resource
- Token expired
- Resource belongs to different club

**Fix:**
- Logout and login again
- Check that resource has correct clubId
- Verify clubId in token matches resource clubId

### Issue 3: Empty data after migration

**Symptom:** Not seeing any data after login
**Fix:**
- Run verification script: `node server/scripts/verify-migration.js`
- Verify all records have clubId
- Check that clubId in token matches data clubId

### Issue 4: Settings not saving

**Symptom:** Settings changes don't persist
**Fix:**
- Check Network tab for PUT /api/settings request
- Verify request includes clubId
- Check response for errors
- Verify settings document has clubId

## ✅ Success Criteria

**Application is working correctly if:**
- ✅ Can login without errors
- ✅ Token includes clubId
- ✅ Can view all data (judges, auditions, dancers, scores)
- ✅ Can create new data (judges, auditions, dancers, scores)
- ✅ Can update existing data
- ✅ Can delete data (with proper permissions)
- ✅ Data is isolated by club (only see your club's data)
- ✅ No 403 Forbidden errors for your own club's data
- ✅ Settings persist correctly
- ✅ Exports only include your club's data

## 📝 Testing Notes

**Browser Console Checks:**
- Open browser console (F12)
- Check for any errors (red text)
- Check for warnings (yellow text)
- Monitor Network tab for failed requests (red status codes)

**Network Tab Checks:**
- All GET requests should filter by clubId
- All POST requests should include clubId
- All PUT/DELETE requests should verify clubId
- Response status codes should be 200 (not 403)

**Database Checks:**
- All new records should have clubId
- All queries should filter by clubId
- All updates should verify clubId matches

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Multi-tenant migration is successful!
2. ✅ Ready to replace hardcoded "MSU Dance Club" with dynamic name
3. ✅ Ready to add club creation/management features
4. ✅ Ready for production deployment

If issues found:
1. Document the issues
2. Fix bugs
3. Re-test affected functionality
4. Update documentation
