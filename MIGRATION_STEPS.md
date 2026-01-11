# Multi-Tenant Migration - Step-by-Step Implementation

## Quick Start: What You Need to Know

### Current State
- Single-club system (MSU Dance Club)
- All data in one database without club isolation
- "MSU Dance Club" hardcoded in multiple places

### Target State
- Multi-tenant system where each club has isolated data
- Clubs can customize their name, colors, settings
- Clubs can "download" their data to self-host if desired
- Existing MSU Dance Club data preserved and migrated safely

## Step-by-Step Implementation

### STEP 1: Create Clubs Collection & Default Club (START HERE)

**File to create**: `server/scripts/create-default-club.js`

This script will:
1. Create a `clubs` collection
2. Create default club "msu-dance-club" 
3. Tag all existing MSU Dance Club data with this clubId
4. Preserve all existing data

**Why this first?** This is the safest step - it only adds new data, doesn't change existing data structure yet.

### STEP 2: Update Authentication (Critical)

**Files to modify**:
- `server/index.js` - Login endpoints
- `client/src/contexts/AuthContext.tsx` - Store clubId in context

**Changes needed**:
- Add `clubId` to JWT token on login
- Store clubId in user context
- Add club selection UI (if user belongs to multiple clubs)

**Safety**: Users can still login, but now their token includes clubId

### STEP 3: Add clubId to All Database Queries (Most Important)

**Files to modify**: `server/index.js` (ALL endpoints)

**Collections that need clubId filtering**:
- ✅ `judges` - Add `clubId` field, filter queries
- ✅ `dancers` - Add `clubId` field, filter queries  
- ✅ `auditions` - Add `clubId` field, filter queries
- ✅ `scores` - Add `clubId` field, filter queries
- ✅ `club_members` - Add `clubId` field, filter queries
- ✅ `settings` - Change from single doc to per-club (clubId in doc path or field)
- ✅ `deliberations` - Add `clubId` field, filter queries
- ✅ `attendance_records` - Add `clubId` field, filter queries
- ✅ `absence_requests` - Add `clubId` field, filter queries
- ✅ `make_up_submissions` - Add `clubId` field, filter queries
- ✅ `audition_videos` - Add `clubId` field, filter queries

**Pattern to follow**:
```javascript
// OLD:
const snapshot = await db.collection('judges').where('email', '==', email).get();

// NEW:
const snapshot = await db.collection('judges')
  .where('clubId', '==', req.user.clubId)
  .where('email', '==', email)
  .get();
```

### STEP 4: Replace Hardcoded "MSU Dance Club"

**Files to modify**:
- `client/src/components/Login.tsx`
- `client/src/components/JudgeDashboard.tsx`
- `client/src/components/DancerRegistration.tsx`
- `client/src/components/DancerLogin.tsx`
- `client/src/components/RecordingView.tsx`
- `client/src/components/AdminDashboard.tsx`

**Change**: Instead of hardcoded "MSU Dance Club", fetch from:
- `appearanceSettings.clubName` from current club's settings
- Or from `clubs` collection based on user's `clubId`

### STEP 5: Settings Per Club

**File to modify**: `server/index.js` - Settings endpoints

**Change**: 
- Settings document ID should include clubId: `settings_{clubId}` or use `clubId` field
- All settings queries filtered by clubId

### STEP 6: Club Management UI (Optional - for later)

**New component**: `client/src/components/ClubManagement.tsx`

**Features**:
- Super admin: Create new clubs
- Club admin: Edit their club settings
- Export club data (for "download" feature)

## Priority Order

### Must Do (Critical - Data Safety)
1. ✅ Create migration script to add clubId to existing data
2. ✅ Update authentication to include clubId in token
3. ✅ Add clubId filtering to ALL database queries
4. ✅ Test that MSU Dance Club data is still accessible

### Should Do (Functionality)
5. Replace hardcoded "MSU Dance Club" with dynamic club name
6. Update settings to be per-club
7. Add club selection UI (if needed)

### Nice to Have (Future)
8. Club management UI
9. Export/import functionality
10. Super admin interface

## Testing Checklist

After each step:
- [ ] Can still login as MSU Dance Club user
- [ ] MSU Dance Club data is visible
- [ ] Can create new auditions, dancers, etc.
- [ ] No errors in console
- [ ] No data leaks (can't see other clubs' data)

## Rollback Strategy

If something goes wrong:
1. Database backups (export all collections before migration)
2. Git commits at each step (so we can revert)
3. Test on staging/copy first
4. Migration script should be idempotent (safe to run multiple times)

## Estimated Time

- Step 1 (Create clubs): 1-2 hours
- Step 2 (Update auth): 2-3 hours  
- Step 3 (Add clubId filtering): 4-6 hours (many files)
- Step 4 (Replace hardcoded names): 1-2 hours
- Step 5 (Settings per club): 1-2 hours
- **Total: 9-15 hours** (can be done incrementally)
