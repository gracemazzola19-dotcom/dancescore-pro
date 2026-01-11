# Multi-Tenant Migration Scripts

## Overview

These scripts migrate your DanceScore Pro database from a single-club system to a multi-tenant architecture where multiple clubs can use the same application with isolated data.

## ⚠️ IMPORTANT: Before Running

1. **BACKUP YOUR DATABASE FIRST!**
   - Export all data from Firestore
   - Or use Firestore backup/export feature
   - Keep the backup safe until migration is verified

2. **Test on a copy first** (recommended)
   - Create a test/staging database
   - Run migration on test data first
   - Verify everything works before running on production

3. **The migration is IDEMPOTENT**
   - Safe to run multiple times
   - Won't duplicate data
   - Skips records that already have clubId

## Migration Script

### File: `migrate-to-multi-tenant.js`

**What it does:**
1. Creates a default club "msu-dance-club" in the `clubs` collection
2. Adds `clubId: 'msu-dance-club'` to all existing records in these collections:
   - judges
   - auditions
   - dancers
   - scores
   - club_members
   - settings
   - deliberations (if exists)
   - attendance_records (if exists)
   - attendance_events (if exists)
   - absence_requests (if exists)
   - make_up_submissions (if exists)
   - audition_videos (if exists)

**How to run:**
```bash
# From the project root
node server/scripts/migrate-to-multi-tenant.js
```

**What to expect:**
- Progress messages for each collection
- Summary of migrated vs skipped records
- Error messages if any issues occur
- All your existing MSU Dance Club data will be preserved

**Example output:**
```
🔄 Starting Multi-Tenant Migration...

📋 Step 1: Creating default club...
✅ Created default club: MSU Dance Club (msu-dance-club)

📋 Step 2: Migrating settings...
✅ Settings migrated (added clubId)

📋 Step 3: Migrating judges...
✅ Judges: 5 migrated, 0 already had clubId

...

📊 MIGRATION SUMMARY
✅ Total records migrated: 127
⏭️  Total records skipped (already had clubId): 0
❌ Total errors: 0

✅ Migration completed successfully!
```

## Verification Script

### File: `verify-migration.js`

**What it does:**
- Checks that the default club exists
- Verifies all records in all collections have a `clubId` field
- Reports any records missing `clubId`
- Provides a summary of the verification

**How to run:**
```bash
# From the project root
node server/scripts/verify-migration.js
```

**What to expect:**
- Check of each collection
- Count of records with/without clubId
- Success message if all records have clubId
- Warning if any records are missing clubId

**Example output:**
```
🔍 Verifying Multi-Tenant Migration...

✅ Default club exists: MSU Dance Club (msu-dance-club)

📋 Checking judges...
   ✅ With clubId: 5

📋 Checking auditions...
   ✅ With clubId: 3

...

📊 VERIFICATION SUMMARY
Total records checked: 127
✅ Records with clubId: 127
❌ Records without clubId: 0
⚠️  Errors encountered: 0

✅ ✅ ✅ MIGRATION VERIFIED SUCCESSFULLY! ✅ ✅ ✅
```

## After Migration

Once the migration is complete and verified:

1. ✅ Your existing MSU Dance Club data is preserved and tagged
2. ⚠️ **BUT** - The application code still needs to be updated to:
   - Include clubId in JWT tokens (Step 2)
   - Filter all queries by clubId (Step 3)
   - Replace hardcoded "MSU Dance Club" (Step 4)

**IMPORTANT:** Until you update the application code (Steps 2-4), the app will still work normally, but it won't be using the clubId for data isolation yet. The migration script just prepares the data structure.

## Rollback

If you need to rollback the migration:

1. The migration only ADDS a `clubId` field - it doesn't delete anything
2. You can manually remove `clubId` fields if needed (not recommended)
3. Better: Restore from your backup if something goes wrong

## Troubleshooting

### Error: "Collection not found"
- Some collections might not exist yet (like deliberations, attendance_events)
- This is OK - the script handles this gracefully
- Those collections will be skipped

### Error: "Permission denied"
- Make sure your Firebase service account has write permissions
- Check `service-account-key.json` is in the correct location

### Records still missing clubId after migration
- Run the migration script again - it's idempotent
- Check the error messages in the output
- Verify Firestore permissions

### Need to re-run migration
- The script is idempotent - safe to run multiple times
- It will skip records that already have clubId
- Only records without clubId will be updated

## Next Steps

After running the migration script and verifying it worked:

1. **Step 2**: Update authentication to include clubId in JWT tokens
2. **Step 3**: Add clubId filtering to all API endpoints  
3. **Step 4**: Replace hardcoded "MSU Dance Club" with dynamic club name
4. **Step 5**: Test everything thoroughly

See `MIGRATION_STEPS.md` for detailed instructions on next steps.
