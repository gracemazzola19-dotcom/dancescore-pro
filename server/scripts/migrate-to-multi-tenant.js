#!/usr/bin/env node

/**
 * Multi-Tenant Migration Script
 * 
 * This script migrates the existing DanceScore Pro database from single-club
 * to multi-tenant architecture by:
 * 1. Creating a default club "msu-dance-club" for existing MSU Dance Club data
 * 2. Adding clubId field to all existing records in all collections
 * 3. Creating settings document for the default club
 * 
 * This script is IDEMPOTENT - safe to run multiple times
 * 
 * Usage: node server/scripts/migrate-to-multi-tenant.js
 */

const dbAdapter = require('../database-adapter');
const db = dbAdapter;

const DEFAULT_CLUB_ID = 'msu-dance-club';
const DEFAULT_CLUB_NAME = 'MSU Dance Club';
const DEFAULT_CLUB_SLUG = 'msu-dance-club';

async function migrateToMultiTenant() {
  console.log('🔄 Starting Multi-Tenant Migration...\n');
  console.log('⚠️  This will add clubId to all existing records');
  console.log('⚠️  All existing MSU Dance Club data will be tagged with clubId:', DEFAULT_CLUB_ID);
  console.log('⚠️  This script is SAFE and IDEMPOTENT (can run multiple times)\n');

  let totalMigrated = 0;
  let totalSkipped = 0;
  const errors = [];

  try {
    // Step 1: Create or get default club
    console.log('📋 Step 1: Creating default club...');
    const clubDoc = await db.collection('clubs').doc(DEFAULT_CLUB_ID).get();
    
    if (!clubDoc.exists) {
      const clubData = {
        name: DEFAULT_CLUB_NAME,
        slug: DEFAULT_CLUB_SLUG,
        createdAt: new Date(),
        active: true,
        isDefault: true, // Mark as default club
        settings: {
          appearanceSettings: {
            clubName: DEFAULT_CLUB_NAME,
            siteTitle: 'DanceScore Pro',
            primaryColor: '#B380FF',
            secondaryColor: '#FFB3D1',
            logoUrl: '',
            showLogoInHeader: true
          }
        }
      };
      
      await db.collection('clubs').doc(DEFAULT_CLUB_ID).set(clubData);
      console.log(`✅ Created default club: ${DEFAULT_CLUB_NAME} (${DEFAULT_CLUB_ID})\n`);
    } else {
      console.log(`✅ Default club already exists: ${DEFAULT_CLUB_NAME}\n`);
    }

    // Step 2: Migrate settings collection
    console.log('📋 Step 2: Migrating settings...');
    const settingsDoc = await db.collection('settings').doc('audition_settings').get();
    
    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      
      // Check if already migrated
      if (!settingsData.clubId) {
        await db.collection('settings').doc('audition_settings').update({
          clubId: DEFAULT_CLUB_ID,
          migratedAt: new Date()
        });
        console.log('✅ Settings migrated (added clubId)\n');
        totalMigrated++;
      } else {
        console.log('⏭️  Settings already have clubId, skipping\n');
        totalSkipped++;
      }
    } else {
      console.log('⏭️  No settings document found, skipping\n');
      totalSkipped++;
    }

    // Step 3: Migrate judges collection
    console.log('📋 Step 3: Migrating judges...');
    const judgesSnapshot = await db.collection('judges').get();
    let judgesMigrated = 0;
    let judgesSkipped = 0;
    
    for (const doc of judgesSnapshot.docs) {
      const judgeData = doc.data();
      
      if (!judgeData.clubId) {
        try {
          await db.collection('judges').doc(doc.id).update({
            clubId: DEFAULT_CLUB_ID
          });
          judgesMigrated++;
        } catch (error) {
          console.error(`  ❌ Error migrating judge ${doc.id}:`, error.message);
          errors.push({ collection: 'judges', id: doc.id, error: error.message });
        }
      } else {
        judgesSkipped++;
      }
    }
    
    console.log(`✅ Judges: ${judgesMigrated} migrated, ${judgesSkipped} already had clubId\n`);
    totalMigrated += judgesMigrated;
    totalSkipped += judgesSkipped;

    // Step 4: Migrate auditions collection
    console.log('📋 Step 4: Migrating auditions...');
    const auditionsSnapshot = await db.collection('auditions').get();
    let auditionsMigrated = 0;
    let auditionsSkipped = 0;
    
    for (const doc of auditionsSnapshot.docs) {
      const auditionData = doc.data();
      
      if (!auditionData.clubId) {
        try {
          await db.collection('auditions').doc(doc.id).update({
            clubId: DEFAULT_CLUB_ID
          });
          auditionsMigrated++;
        } catch (error) {
          console.error(`  ❌ Error migrating audition ${doc.id}:`, error.message);
          errors.push({ collection: 'auditions', id: doc.id, error: error.message });
        }
      } else {
        auditionsSkipped++;
      }
    }
    
    console.log(`✅ Auditions: ${auditionsMigrated} migrated, ${auditionsSkipped} already had clubId\n`);
    totalMigrated += auditionsMigrated;
    totalSkipped += auditionsSkipped;

    // Step 5: Migrate dancers collection
    console.log('📋 Step 5: Migrating dancers...');
    const dancersSnapshot = await db.collection('dancers').get();
    let dancersMigrated = 0;
    let dancersSkipped = 0;
    
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      
      if (!dancerData.clubId) {
        try {
          await db.collection('dancers').doc(doc.id).update({
            clubId: DEFAULT_CLUB_ID
          });
          dancersMigrated++;
        } catch (error) {
          console.error(`  ❌ Error migrating dancer ${doc.id}:`, error.message);
          errors.push({ collection: 'dancers', id: doc.id, error: error.message });
        }
      } else {
        dancersSkipped++;
      }
    }
    
    console.log(`✅ Dancers: ${dancersMigrated} migrated, ${dancersSkipped} already had clubId\n`);
    totalMigrated += dancersMigrated;
    totalSkipped += dancersSkipped;

    // Step 6: Migrate scores collection
    console.log('📋 Step 6: Migrating scores...');
    const scoresSnapshot = await db.collection('scores').get();
    let scoresMigrated = 0;
    let scoresSkipped = 0;
    
    // Process in batches to avoid timeout
    const batchSize = 500;
    const scoreDocs = scoresSnapshot.docs;
    
      for (let i = 0; i < scoreDocs.length; i += batchSize) {
        const batch = dbAdapter.batch();
        const batchDocs = scoreDocs.slice(i, i + batchSize);
        let batchCount = 0;
      
      for (const doc of batchDocs) {
        const scoreData = doc.data();
        
        if (!scoreData.clubId) {
          batch.update(db.collection('scores').doc(doc.id), {
            clubId: DEFAULT_CLUB_ID
          });
          batchCount++;
        } else {
          scoresSkipped++;
        }
      }
      
      if (batchCount > 0) {
        try {
          await batch.commit();
          scoresMigrated += batchCount;
        } catch (error) {
          console.error(`  ❌ Error committing batch (scores):`, error.message);
          errors.push({ collection: 'scores', batch: i, error: error.message });
        }
      }
    }
    
    console.log(`✅ Scores: ${scoresMigrated} migrated, ${scoresSkipped} already had clubId\n`);
    totalMigrated += scoresMigrated;
    totalSkipped += scoresSkipped;

    // Step 7: Migrate club_members collection
    console.log('📋 Step 7: Migrating club_members...');
    const clubMembersSnapshot = await db.collection('club_members').get();
    let membersMigrated = 0;
    let membersSkipped = 0;
    
    for (const doc of clubMembersSnapshot.docs) {
      const memberData = doc.data();
      
      if (!memberData.clubId) {
        try {
          await db.collection('club_members').doc(doc.id).update({
            clubId: DEFAULT_CLUB_ID
          });
          membersMigrated++;
        } catch (error) {
          console.error(`  ❌ Error migrating club member ${doc.id}:`, error.message);
          errors.push({ collection: 'club_members', id: doc.id, error: error.message });
        }
      } else {
        membersSkipped++;
      }
    }
    
    console.log(`✅ Club Members: ${membersMigrated} migrated, ${membersSkipped} already had clubId\n`);
    totalMigrated += membersMigrated;
    totalSkipped += membersSkipped;

    // Step 8: Migrate deliberations collection (if exists)
    console.log('📋 Step 8: Migrating deliberations...');
    try {
      const deliberationsSnapshot = await db.collection('deliberations').get();
      let deliberationsMigrated = 0;
      let deliberationsSkipped = 0;
      
      for (const doc of deliberationsSnapshot.docs) {
        const deliberationData = doc.data();
        
        if (!deliberationData.clubId) {
          try {
            await db.collection('deliberations').doc(doc.id).update({
              clubId: DEFAULT_CLUB_ID
            });
            deliberationsMigrated++;
          } catch (error) {
            console.error(`  ❌ Error migrating deliberation ${doc.id}:`, error.message);
            errors.push({ collection: 'deliberations', id: doc.id, error: error.message });
          }
        } else {
          deliberationsSkipped++;
        }
      }
      
      console.log(`✅ Deliberations: ${deliberationsMigrated} migrated, ${deliberationsSkipped} already had clubId\n`);
      totalMigrated += deliberationsMigrated;
      totalSkipped += deliberationsSkipped;
    } catch (error) {
      console.log(`⏭️  Deliberations collection not found or error: ${error.message}\n`);
    }

    // Step 9: Migrate attendance_records collection (if exists)
    console.log('📋 Step 9: Migrating attendance_records...');
    try {
      const attendanceSnapshot = await db.collection('attendance_records').get();
      let attendanceMigrated = 0;
      let attendanceSkipped = 0;
      
      // Process in batches
      const attendanceDocs = attendanceSnapshot.docs;
      
      for (let i = 0; i < attendanceDocs.length; i += batchSize) {
        const batch = dbAdapter.batch();
        const batchDocs = attendanceDocs.slice(i, i + batchSize);
        let batchCount = 0;
        
        for (const doc of batchDocs) {
          const recordData = doc.data();
          
          if (!recordData.clubId) {
            batch.update(db.collection('attendance_records').doc(doc.id), {
              clubId: DEFAULT_CLUB_ID
            });
            batchCount++;
          } else {
            attendanceSkipped++;
          }
        }
        
        if (batchCount > 0) {
          try {
            await batch.commit();
            attendanceMigrated += batchCount;
          } catch (error) {
            console.error(`  ❌ Error committing batch (attendance_records):`, error.message);
            errors.push({ collection: 'attendance_records', batch: i, error: error.message });
          }
        }
      }
      
      console.log(`✅ Attendance Records: ${attendanceMigrated} migrated, ${attendanceSkipped} already had clubId\n`);
      totalMigrated += attendanceMigrated;
      totalSkipped += attendanceSkipped;
    } catch (error) {
      console.log(`⏭️  Attendance records collection not found or error: ${error.message}\n`);
    }

    // Step 10: Migrate attendance_events collection (if exists)
    console.log('📋 Step 10: Migrating attendance_events...');
    try {
      const eventsSnapshot = await db.collection('attendance_events').get();
      let eventsMigrated = 0;
      let eventsSkipped = 0;
      
      for (const doc of eventsSnapshot.docs) {
        const eventData = doc.data();
        
        if (!eventData.clubId) {
          try {
            await db.collection('attendance_events').doc(doc.id).update({
              clubId: DEFAULT_CLUB_ID
            });
            eventsMigrated++;
          } catch (error) {
            console.error(`  ❌ Error migrating attendance event ${doc.id}:`, error.message);
            errors.push({ collection: 'attendance_events', id: doc.id, error: error.message });
          }
        } else {
          eventsSkipped++;
        }
      }
      
      console.log(`✅ Attendance Events: ${eventsMigrated} migrated, ${eventsSkipped} already had clubId\n`);
      totalMigrated += eventsMigrated;
      totalSkipped += eventsSkipped;
    } catch (error) {
      console.log(`⏭️  Attendance events collection not found or error: ${error.message}\n`);
    }

    // Step 11: Migrate absence_requests collection (if exists)
    console.log('📋 Step 11: Migrating absence_requests...');
    try {
      const absenceRequestsSnapshot = await db.collection('absence_requests').get();
      let absenceRequestsMigrated = 0;
      let absenceRequestsSkipped = 0;
      
      for (const doc of absenceRequestsSnapshot.docs) {
        const requestData = doc.data();
        
        if (!requestData.clubId) {
          try {
            await db.collection('absence_requests').doc(doc.id).update({
              clubId: DEFAULT_CLUB_ID
            });
            absenceRequestsMigrated++;
          } catch (error) {
            console.error(`  ❌ Error migrating absence request ${doc.id}:`, error.message);
            errors.push({ collection: 'absence_requests', id: doc.id, error: error.message });
          }
        } else {
          absenceRequestsSkipped++;
        }
      }
      
      console.log(`✅ Absence Requests: ${absenceRequestsMigrated} migrated, ${absenceRequestsSkipped} already had clubId\n`);
      totalMigrated += absenceRequestsMigrated;
      totalSkipped += absenceRequestsSkipped;
    } catch (error) {
      console.log(`⏭️  Absence requests collection not found or error: ${error.message}\n`);
    }

    // Step 12: Migrate make_up_submissions collection (if exists)
    console.log('📋 Step 12: Migrating make_up_submissions...');
    try {
      const makeUpSnapshot = await db.collection('make_up_submissions').get();
      let makeUpMigrated = 0;
      let makeUpSkipped = 0;
      
      for (const doc of makeUpSnapshot.docs) {
        const submissionData = doc.data();
        
        if (!submissionData.clubId) {
          try {
            await db.collection('make_up_submissions').doc(doc.id).update({
              clubId: DEFAULT_CLUB_ID
            });
            makeUpMigrated++;
          } catch (error) {
            console.error(`  ❌ Error migrating make-up submission ${doc.id}:`, error.message);
            errors.push({ collection: 'make_up_submissions', id: doc.id, error: error.message });
          }
        } else {
          makeUpSkipped++;
        }
      }
      
      console.log(`✅ Make-Up Submissions: ${makeUpMigrated} migrated, ${makeUpSkipped} already had clubId\n`);
      totalMigrated += makeUpMigrated;
      totalSkipped += makeUpSkipped;
    } catch (error) {
      console.log(`⏭️  Make-up submissions collection not found or error: ${error.message}\n`);
    }

    // Step 13: Migrate audition_videos collection (if exists)
    console.log('📋 Step 13: Migrating audition_videos...');
    try {
      const videosSnapshot = await db.collection('audition_videos').get();
      let videosMigrated = 0;
      let videosSkipped = 0;
      
      for (const doc of videosSnapshot.docs) {
        const videoData = doc.data();
        
        if (!videoData.clubId) {
          try {
            await db.collection('audition_videos').doc(doc.id).update({
              clubId: DEFAULT_CLUB_ID
            });
            videosMigrated++;
          } catch (error) {
            console.error(`  ❌ Error migrating video ${doc.id}:`, error.message);
            errors.push({ collection: 'audition_videos', id: doc.id, error: error.message });
          }
        } else {
          videosSkipped++;
        }
      }
      
      console.log(`✅ Audition Videos: ${videosMigrated} migrated, ${videosSkipped} already had clubId\n`);
      totalMigrated += videosMigrated;
      totalSkipped += videosSkipped;
    } catch (error) {
      console.log(`⏭️  Audition videos collection not found or error: ${error.message}\n`);
    }

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Total records migrated: ${totalMigrated}`);
    console.log(`⏭️  Total records skipped (already had clubId): ${totalSkipped}`);
    console.log(`❌ Total errors: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED:');
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.collection}/${err.id || err.batch}: ${err.error}`);
      });
      console.log('');
    }

    console.log('✅ Migration completed successfully!');
    console.log(`✅ Default club "${DEFAULT_CLUB_NAME}" (${DEFAULT_CLUB_ID}) is ready`);
    console.log('✅ All existing MSU Dance Club data has been tagged with clubId\n');

    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Verify data integrity by checking a few records');
    console.log('   2. Update authentication to include clubId in JWT tokens');
    console.log('   3. Update all API endpoints to filter by clubId');
    console.log('   4. Test the application to ensure everything still works\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR during migration:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateToMultiTenant()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToMultiTenant, DEFAULT_CLUB_ID };
