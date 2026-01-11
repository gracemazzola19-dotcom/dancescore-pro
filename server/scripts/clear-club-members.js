#!/usr/bin/env node

/**
 * Clear Club Members Database - End of Season Cleanup
 * 
 * This script clears all club members (dancers) from the database
 * while preserving system data like judges, settings, and auditions.
 * 
 * Usage: node scripts/clear-club-members.js
 */

const LocalDatabase = require('../local-database');

async function clearClubMembers() {
  console.log('🧹 Starting End of Season Club Members Cleanup...\n');
  
  try {
    const localDb = new LocalDatabase();
    
    // Get current counts before cleanup
    const dancersSnapshot = await localDb.collection('dancers').get();
    const auditionsSnapshot = await localDb.collection('auditions').get();
    const deliberationsSnapshot = await localDb.collection('deliberations').get();
    const judgesSnapshot = await localDb.collection('judges').get();
    const settingsSnapshot = await localDb.collection('settings').get();
    
    console.log('📊 Current Database Status:');
    console.log(`   Dancers (Club Members): ${dancersSnapshot.size}`);
    console.log(`   Auditions: ${auditionsSnapshot.size}`);
    console.log(`   Deliberations: ${deliberationsSnapshot.size}`);
    console.log(`   Judges: ${judgesSnapshot.size}`);
    console.log(`   Settings: ${settingsSnapshot.size}\n`);
    
    // Confirm cleanup
    console.log('⚠️  This will delete ALL club members (dancers) from the database.');
    console.log('   This action cannot be undone!\n');
    
    // Delete all dancers
    console.log('🗑️  Deleting club members...');
    let deletedCount = 0;
    
    for (const doc of dancersSnapshot.docs) {
      await localDb.collection('dancers').doc(doc.id).delete();
      deletedCount++;
    }
    
    console.log(`✅ Deleted ${deletedCount} club members\n`);
    
    // Verify cleanup
    const verifySnapshot = await localDb.collection('dancers').get();
    console.log('🔍 Verification:');
    console.log(`   Remaining dancers: ${verifySnapshot.size}`);
    
    if (verifySnapshot.size === 0) {
      console.log('✅ Club members database cleared successfully!\n');
    } else {
      console.log('❌ Some club members may not have been deleted.\n');
    }
    
    // Show final status
    const finalAuditionsSnapshot = await localDb.collection('auditions').get();
    const finalJudgesSnapshot = await localDb.collection('judges').get();
    const finalSettingsSnapshot = await localDb.collection('settings').get();
    
    console.log('📊 Final Database Status:');
    console.log(`   Dancers (Club Members): 0 (cleared)`);
    console.log(`   Auditions: ${finalAuditionsSnapshot.size} (preserved)`);
    console.log(`   Judges: ${finalJudgesSnapshot.size} (preserved)`);
    console.log(`   Settings: ${finalSettingsSnapshot.size} (preserved)`);
    
    console.log('\n🎉 End of Season Cleanup Complete!');
    console.log('   The database is now ready for the next season.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
clearClubMembers();



