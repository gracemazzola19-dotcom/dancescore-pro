#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * This script verifies that the multi-tenant migration was successful
 * by checking that all records have a clubId field.
 * 
 * Usage: node server/scripts/verify-migration.js
 */

const dbAdapter = require('../database-adapter');
const db = dbAdapter;

const DEFAULT_CLUB_ID = 'msu-dance-club';

async function verifyMigration() {
  console.log('🔍 Verifying Multi-Tenant Migration...\n');

  const results = {
    total: 0,
    withClubId: 0,
    withoutClubId: 0,
    errors: []
  };

  try {
    // Verify clubs collection exists
    console.log('📋 Step 1: Verifying clubs collection...');
    const clubsSnapshot = await db.collection('clubs').doc(DEFAULT_CLUB_ID).get();
    
    if (clubsSnapshot.exists) {
      const clubData = clubsSnapshot.data();
      console.log(`✅ Default club exists: ${clubData.name} (${DEFAULT_CLUB_ID})`);
    } else {
      console.log(`❌ Default club NOT found: ${DEFAULT_CLUB_ID}`);
      results.errors.push('Default club not found');
    }
    console.log('');

    // Collections to verify
    const collections = [
      'judges',
      'auditions',
      'dancers',
      'scores',
      'club_members',
      'settings',
      'deliberations',
      'attendance_records',
      'attendance_events',
      'absence_requests',
      'make_up_submissions',
      'audition_videos'
    ];

    for (const collectionName of collections) {
      try {
        console.log(`📋 Checking ${collectionName}...`);
        const snapshot = await db.collection(collectionName).get();
        
        if (snapshot.empty) {
          console.log(`⏭️  ${collectionName}: No records found (empty collection)\n`);
          continue;
        }

        let withClubId = 0;
        let withoutClubId = 0;
        const recordsWithoutClubId = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          results.total++;
          
          if (data.clubId) {
            withClubId++;
            results.withClubId++;
          } else {
            withoutClubId++;
            results.withoutClubId++;
            recordsWithoutClubId.push({ id: doc.id, name: data.name || data.email || 'Unknown' });
          }
        });

        console.log(`   ✅ With clubId: ${withClubId}`);
        if (withoutClubId > 0) {
          console.log(`   ❌ Without clubId: ${withoutClubId}`);
          console.log(`   ⚠️  Records missing clubId:`);
          recordsWithoutClubId.slice(0, 5).forEach(record => {
            console.log(`      - ${record.id}: ${record.name}`);
          });
          if (recordsWithoutClubId.length > 5) {
            console.log(`      ... and ${recordsWithoutClubId.length - 5} more`);
          }
          results.errors.push(`${collectionName}: ${withoutClubId} records without clubId`);
        }
        console.log('');

      } catch (error) {
        if (error.code === 5) { // NOT_FOUND error in Firestore
          console.log(`⏭️  ${collectionName}: Collection does not exist (not an error)\n`);
        } else {
          console.log(`❌ Error checking ${collectionName}: ${error.message}\n`);
          results.errors.push(`${collectionName}: ${error.message}`);
        }
      }
    }

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total records checked: ${results.total}`);
    console.log(`✅ Records with clubId: ${results.withClubId}`);
    console.log(`❌ Records without clubId: ${results.withoutClubId}`);
    console.log(`⚠️  Errors encountered: ${results.errors.length}\n`);

    if (results.errors.length > 0) {
      console.log('❌ ERRORS:');
      results.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err}`);
      });
      console.log('');
    }

    if (results.withoutClubId === 0 && results.errors.length === 0) {
      console.log('✅ ✅ ✅ MIGRATION VERIFIED SUCCESSFULLY! ✅ ✅ ✅');
      console.log('All records have clubId assigned');
      console.log('You can proceed with the next steps\n');
      return true;
    } else {
      console.log('⚠️  ⚠️  ⚠️  MIGRATION INCOMPLETE ⚠️  ⚠️  ⚠️');
      console.log(`Please run the migration script again to fix ${results.withoutClubId} missing clubIds\n`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR during verification:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the verification
if (require.main === module) {
  verifyMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyMigration };
