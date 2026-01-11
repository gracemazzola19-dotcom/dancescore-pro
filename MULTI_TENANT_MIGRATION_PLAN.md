# DanceScore Pro - Multi-Tenant Migration Plan

## Overview
Transform DanceScore Pro from a single-club system (MSU Dance Club) to a multi-tenant system where multiple clubs can use the same application with isolated databases.

## Architecture Options

### Option 1: Multi-Tenant Single Database (Recommended)
- **Pros**: Easier to maintain, scalable, all clubs share one database
- **Cons**: Data isolation relies on filtering (must be careful)
- **How**: Add `clubId` field to all collections, filter all queries by club

### Option 2: Separate Databases Per Club
- **Pros**: Complete data isolation, easier to export/migrate
- **Cons**: More complex deployment, harder to maintain
- **How**: Dynamic database connection based on club

### Option 3: Separate Deployments Per Club (What "download" implies)
- **Pros**: Complete independence, clubs can self-host
- **Cons**: Most complex, requires export/import tools
- **How**: Each club gets their own instance + data export/import

## Recommended Approach: Hybrid (Option 1 + Export Capability)
- Implement Option 1 (multi-tenant with clubId)
- Add export/import functionality for Option 3 later
- Keep existing MSU Dance Club data safe by migrating it with a special `clubId`

## Implementation Steps

### Phase 1: Database Schema Changes (Critical)

1. **Create `clubs` Collection**
   - Fields: `id`, `name`, `slug` (unique identifier), `createdAt`, `active`, `settings`
   - Store: club name, subdomain/identifier, appearance settings

2. **Add `clubId` to ALL Collections**
   - `judges` → `clubId`
   - `dancers` → `clubId`
   - `auditions` → `clubId`
   - `scores` → `clubId`
   - `club_members` → `clubId`
   - `settings` → `clubId` (one settings doc per club)
   - `attendance_records` → `clubId`
   - `absence_requests` → `clubId`
   - `make_up_submissions` → `clubId`
   - `audition_videos` → `clubId`

3. **Migration Script for Existing MSU Dance Club Data**
   - Create default club: `msu-dance-club` (or `msu-dance`)
   - Add `clubId: 'msu-dance-club'` to all existing records
   - Ensure all existing data is preserved

### Phase 2: Authentication & User Context

1. **Update Login Flow**
   - Add club selection before/after login
   - Store `clubId` in JWT token
   - Update `authenticateToken` middleware to extract `clubId` from token

2. **Update All API Endpoints**
   - Add `clubId` filtering to ALL queries
   - Ensure users can only access data from their club
   - Add `clubId` to all create/update operations

3. **Club Management UI**
   - Super Admin view: Create/manage clubs
   - Club Admin view: Manage their club settings
   - Club switching (for users with access to multiple clubs)

### Phase 3: UI Changes

1. **Replace Hardcoded "MSU Dance Club"**
   - Use `appearanceSettings.clubName` from current club's settings
   - Make it dynamic based on logged-in club

2. **Club Selection on Login**
   - Allow users to select/switch clubs if they have access
   - Remember last selected club

3. **Settings Isolation**
   - Each club has their own settings document
   - Settings queries filtered by `clubId`

### Phase 4: Data Export/Import (For "Download" Feature)

1. **Export Functionality**
   - Export all club data as JSON/CSV
   - Include: auditions, dancers, scores, settings, videos

2. **Import Functionality**
   - Import data from export file
   - Validate and sanitize data
   - Create new club from import

3. **Standalone Deployment Package**
   - Package entire app + instructions for deployment
   - Include database setup scripts
   - Allow clubs to self-host if desired

## Migration Strategy for Existing MSU Dance Club Data

### Step 1: Create Migration Script
```javascript
// server/scripts/migrate-to-multi-tenant.js
- Create default club: "msu-dance-club"
- Add clubId to all existing records
- Verify all data is migrated
```

### Step 2: Test Migration
- Create test database
- Run migration on test data
- Verify all queries work with clubId

### Step 3: Backup Production Data
- Export all current data
- Store backup safely

### Step 4: Run Production Migration
- Run migration script on production
- Verify data integrity
- Test application functionality

## Security Considerations

1. **Data Isolation**
   - Always filter by clubId in queries (never skip!)
   - Add middleware to enforce clubId on all requests
   - Prevent clubId manipulation in requests

2. **Access Control**
   - Users can only access their club's data
   - Super Admin can access all clubs (optional)
   - Club admins can only manage their club

3. **Validation**
   - Validate clubId exists before operations
   - Prevent creating data in non-existent clubs
   - Audit logs per club

## Implementation Priority

### High Priority (Must Have)
1. ✅ Database schema changes (add clubId)
2. ✅ Migration script for existing data
3. ✅ Update authentication to include clubId
4. ✅ Filter all queries by clubId
5. ✅ Replace hardcoded "MSU Dance Club" with dynamic club name

### Medium Priority (Should Have)
6. Club management UI (create/edit clubs)
7. Club selection on login
8. Settings isolation per club
9. Export functionality

### Low Priority (Nice to Have)
10. Import functionality
11. Super admin interface
12. Multi-club access for users
13. Standalone deployment package

## Testing Checklist

- [ ] MSU Dance Club data migrated correctly
- [ ] All queries filter by clubId
- [ ] Users can only see their club's data
- [ ] Settings are isolated per club
- [ ] Club name displays correctly everywhere
- [ ] New clubs can be created
- [ ] Export/import works correctly
- [ ] No data leaks between clubs

## Rollback Plan

1. Keep backup of pre-migration data
2. Migration script should be reversible
3. Test rollback on staging first
4. Document rollback procedure
