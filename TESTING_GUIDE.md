# Multi-Tenant Migration - Testing Guide

## Quick Start Testing

### 1. Start the Application

```bash
# From project root
npm run dev
```

This will start:
- Backend server on port 5001 (see server/index.js line 16)
- Frontend React app on port 3000

### 2. Test Authentication (Critical)

**Test Judge Login:**
1. Open http://localhost:3000
2. Login with judge credentials
3. Check browser console for JWT token
4. Verify token contains `clubId` field
5. Check Network tab → Login request → Response should include `clubId: "msu-dance-club"`

**Test Dancer Login:**
1. Go to dancer login page
2. Login with dancer credentials
3. Verify token contains `clubId` field

### 3. Test Core Data Isolation

**Test Judges:**
1. Login as admin/judge
2. Go to Admin Dashboard → Judges tab
3. **Expected:** Only see judges from your club (msu-dance-club)
4. Try to create a new judge
5. **Expected:** New judge should have `clubId: "msu-dance-club"`

**Test Auditions:**
1. Create a new audition
2. **Expected:** Audition should have `clubId: "msu-dance-club"`
3. View auditions list
4. **Expected:** Only see auditions from your club
5. Try to access an audition from a different club (if you have test data)
6. **Expected:** Should get 403 Forbidden error

**Test Dancers:**
1. Create a new dancer
2. **Expected:** Dancer should have `clubId: "msu-dance-club"`
3. View dancers list
4. **Expected:** Only see dancers from your club

**Test Scores:**
1. Submit scores as a judge
2. **Expected:** Score should have `clubId: "msu-dance-club"`
3. View results
4. **Expected:** Only see scores from your club

### 4. Test Settings

**Test Settings Isolation:**
1. Go to Admin Dashboard → Settings
2. Update any setting
3. **Expected:** Settings should be saved with `clubId`
4. Logout and login again
5. **Expected:** Settings should persist per club

### 5. Test Attendance Features

**Test Attendance Events:**
1. Create an attendance event
2. **Expected:** Event should have `clubId: "msu-dance-club"`
3. View attendance events
4. **Expected:** Only see events from your club

**Test Attendance Records:**
1. Create an attendance record (public or admin)
2. **Expected:** Record should have `clubId` from the event
3. View attendance summary
4. **Expected:** Only see records from your club

### 6. Test Videos

**Test Video Upload:**
1. Go to Recording View
2. Upload a video
3. **Expected:** Video should have `clubId: "msu-dance-club"`
4. View videos in Audition Details
5. **Expected:** Only see videos from your club

### 7. Test Data Management

**Test Clear Operations (Admin Only):**
1. Login as admin
2. Go to Settings → Database Management
3. Try "Clear Club Members"
4. **Expected:** Should only clear members from your club
5. **Verify:** Members from other clubs (if any) should remain

**Test Database Reset (Admin Only):**
1. Try "Full Reset"
2. **Expected:** Should only reset data from your club
3. **Verify:** Judges and settings should remain
4. **Verify:** Data from other clubs should remain

### 8. Test Exports

**Test CSV Export:**
1. Go to Results page
2. Export as CSV
3. **Expected:** CSV should only contain dancers from your club

**Test Excel Export:**
1. Export as Excel
2. **Expected:** Excel should only contain dancers from your club

### 9. Test Error Scenarios

**Test Cross-Club Access:**
1. Try to access a resource from a different club (if you have test data)
2. **Expected:** Should get 403 Forbidden error

**Test Missing clubId:**
1. Check if old tokens without clubId still work
2. **Expected:** Should fallback to 'msu-dance-club'

### 10. Browser Console Checks

**Check for Errors:**
- Open browser console (F12)
- Look for any 403 Forbidden errors (should not happen for your own club's data)
- Look for any 404 errors
- Look for any JavaScript errors

**Check Network Requests:**
- All GET requests should filter by clubId
- All POST requests should include clubId
- All PUT/DELETE requests should verify clubId

## Common Issues to Watch For

### Issue 1: Missing clubId in JWT
**Symptom:** `clubId` is undefined in requests
**Fix:** Logout and login again to get new token with clubId

### Issue 2: 403 Forbidden errors
**Symptom:** Getting access denied errors
**Possible causes:**
- clubId mismatch
- Token expired
- Resource belongs to different club

### Issue 3: Empty data after migration
**Symptom:** Not seeing any data after login
**Fix:** Verify migration script ran successfully and all records have clubId

### Issue 4: Settings not saving
**Symptom:** Settings changes don't persist
**Fix:** Check that settings endpoint includes clubId in updates

## Testing Checklist

- [ ] Judge login works and includes clubId in token
- [ ] Dancer login works and includes clubId in token
- [ ] Can view judges (filtered by clubId)
- [ ] Can create judge (includes clubId)
- [ ] Can update judge (verifies clubId)
- [ ] Can delete judge (verifies clubId)
- [ ] Can view auditions (filtered by clubId)
- [ ] Can create audition (includes clubId)
- [ ] Can update audition (verifies clubId)
- [ ] Can delete audition (verifies clubId)
- [ ] Can view dancers (filtered by clubId)
- [ ] Can create dancer (includes clubId)
- [ ] Can update dancer (verifies clubId)
- [ ] Can hide/show dancer (verifies clubId)
- [ ] Can delete dancer (verifies clubId)
- [ ] Can submit scores (includes clubId)
- [ ] Can view scores (filtered by clubId)
- [ ] Can view results (filtered by clubId)
- [ ] Can view club members (filtered by clubId)
- [ ] Can upload videos (includes clubId)
- [ ] Can view videos (filtered by clubId)
- [ ] Can delete videos (verifies clubId)
- [ ] Can create attendance events (includes clubId)
- [ ] Can view attendance events (filtered by clubId)
- [ ] Can create attendance records (includes clubId)
- [ ] Can view attendance records (filtered by clubId)
- [ ] Can create absence requests (includes clubId from event)
- [ ] Can view absence requests (filtered by clubId)
- [ ] Can create make-up submissions (includes clubId from event)
- [ ] Can view make-up submissions (filtered by clubId)
- [ ] Can export CSV (filtered by clubId)
- [ ] Can export Excel (filtered by clubId)
- [ ] Settings work per club
- [ ] Clear operations only affect current club
- [ ] Database reset only affects current club
- [ ] No cross-club data access

## Performance Testing

**Test with Large Datasets:**
- Create multiple auditions (10+)
- Create many dancers (100+)
- Create many scores (500+)
- Test query performance
- Test export performance

**Test Concurrent Users:**
- Multiple judges scoring simultaneously
- Multiple admins managing data
- Verify no data conflicts

## Security Testing

**Test Data Isolation:**
- Create test data for two different clubs
- Login as user from club 1
- Verify cannot access club 2's data
- Verify cannot modify club 2's data
- Verify cannot delete club 2's data

**Test Permission Boundaries:**
- Login as judge (not admin)
- Verify cannot access admin endpoints
- Verify cannot modify restricted data
- Verify can only see own club's data

## Next Steps After Testing

If all tests pass:
1. ✅ Multi-tenant migration is successful
2. ✅ Ready to replace hardcoded "MSU Dance Club"
3. ✅ Ready for club creation/management features
4. ✅ Ready for production deployment

If issues found:
1. Document the issues
2. Fix bugs
3. Re-test
4. Update documentation
