#!/usr/bin/env node

/**
 * DanceScore Pro - Database Management Script
 * 
 * This script provides various database cleanup options for end of season
 * and system maintenance.
 * 
 * Usage: node scripts/database-cleanup.js [option]
 * 
 * Options:
 *   clear-club-members    - Clear all club members (dancers)
 *   clear-auditions       - Clear all auditions
 *   clear-deliberations   - Clear all deliberations
 *   full-reset           - Clear everything except judges and settings
 *   status              - Show current database status
 */

const LocalDatabase = require('../local-database');

async function showStatus() {
  console.log('📊 Current Database Status:\n');
  
  try {
    const localDb = new LocalDatabase();
    
    const dancersSnapshot = await localDb.collection('dancers').get();
    const auditionsSnapshot = await localDb.collection('auditions').get();
    const deliberationsSnapshot = await localDb.collection('deliberations').get();
    const judgesSnapshot = await localDb.collection('judges').get();
    const settingsSnapshot = await localDb.collection('settings').get();
    
    console.log(`   Dancers (Club Members): ${dancersSnapshot.size}`);
    console.log(`   Auditions: ${auditionsSnapshot.size}`);
    console.log(`   Deliberations: ${deliberationsSnapshot.size}`);
    console.log(`   Judges: ${judgesSnapshot.size}`);
    console.log(`   Settings: ${settingsSnapshot.size}\n`);
    
  } catch (error) {
    console.error('❌ Error getting status:', error.message);
  }
}

async function clearClubMembers() {
  console.log('🧹 Clearing Club Members Database...\n');
  
  try {
    const localDb = new LocalDatabase();
    
    const dancersSnapshot = await localDb.collection('dancers').get();
    console.log(`Found ${dancersSnapshot.size} club members to delete\n`);
    
    let deletedCount = 0;
    for (const doc of dancersSnapshot.docs) {
      await localDb.collection('dancers').doc(doc.id).delete();
      deletedCount++;
    }
    
    console.log(`✅ Deleted ${deletedCount} club members`);
    console.log('✅ Club members database cleared successfully!\n');
    
  } catch (error) {
    console.error('❌ Error clearing club members:', error.message);
  }
}

async function clearAuditions() {
  console.log('🧹 Clearing Auditions Database...\n');
  
  try {
    const localDb = new LocalDatabase();
    
    const auditionsSnapshot = await localDb.collection('auditions').get();
    console.log(`Found ${auditionsSnapshot.size} auditions to delete\n`);
    
    let deletedCount = 0;
    for (const doc of auditionsSnapshot.docs) {
      await localDb.collection('auditions').doc(doc.id).delete();
      deletedCount++;
    }
    
    console.log(`✅ Deleted ${deletedCount} auditions`);
    console.log('✅ Auditions database cleared successfully!\n');
    
  } catch (error) {
    console.error('❌ Error clearing auditions:', error.message);
  }
}

async function clearDeliberations() {
  console.log('🧹 Clearing Deliberations Database...\n');
  
  try {
    const localDb = new LocalDatabase();
    
    const deliberationsSnapshot = await localDb.collection('deliberations').get();
    console.log(`Found ${deliberationsSnapshot.size} deliberations to delete\n`);
    
    let deletedCount = 0;
    for (const doc of deliberationsSnapshot.docs) {
      await localDb.collection('deliberations').doc(doc.id).delete();
      deletedCount++;
    }
    
    console.log(`✅ Deleted ${deletedCount} deliberations`);
    console.log('✅ Deliberations database cleared successfully!\n');
    
  } catch (error) {
    console.error('❌ Error clearing deliberations:', error.message);
  }
}

async function fullReset() {
  console.log('🧹 Performing Full Database Reset...\n');
  console.log('⚠️  This will delete ALL data except judges and settings!\n');
  
  try {
    const localDb = new LocalDatabase();
    
    // Clear dancers
    const dancersSnapshot = await localDb.collection('dancers').get();
    console.log(`Deleting ${dancersSnapshot.size} club members...`);
    for (const doc of dancersSnapshot.docs) {
      await localDb.collection('dancers').doc(doc.id).delete();
    }
    
    // Clear auditions
    const auditionsSnapshot = await localDb.collection('auditions').get();
    console.log(`Deleting ${auditionsSnapshot.size} auditions...`);
    for (const doc of auditionsSnapshot.docs) {
      await localDb.collection('auditions').doc(doc.id).delete();
    }
    
    // Clear deliberations
    const deliberationsSnapshot = await localDb.collection('deliberations').get();
    console.log(`Deleting ${deliberationsSnapshot.size} deliberations...`);
    for (const doc of deliberationsSnapshot.docs) {
      await localDb.collection('deliberations').doc(doc.id).delete();
    }
    
    console.log('\n✅ Full database reset complete!');
    console.log('✅ Judges and settings preserved\n');
    
  } catch (error) {
    console.error('❌ Error during full reset:', error.message);
  }
}

function showHelp() {
  console.log('DanceScore Pro - Database Management Script\n');
  console.log('Usage: node scripts/database-cleanup.js [option]\n');
  console.log('Options:');
  console.log('  clear-club-members    - Clear all club members (dancers)');
  console.log('  clear-auditions       - Clear all auditions');
  console.log('  clear-deliberations   - Clear all deliberations');
  console.log('  full-reset           - Clear everything except judges and settings');
  console.log('  status              - Show current database status');
  console.log('  help                - Show this help message\n');
  console.log('Examples:');
  console.log('  node scripts/database-cleanup.js status');
  console.log('  node scripts/database-cleanup.js clear-club-members');
  console.log('  node scripts/database-cleanup.js full-reset\n');
}

// Main execution
async function main() {
  const option = process.argv[2];
  
  switch (option) {
    case 'clear-club-members':
      await clearClubMembers();
      break;
    case 'clear-auditions':
      await clearAuditions();
      break;
    case 'clear-deliberations':
      await clearDeliberations();
      break;
    case 'full-reset':
      await fullReset();
      break;
    case 'status':
      await showStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log('❌ Invalid option. Use "help" to see available options.\n');
      showHelp();
      process.exit(1);
  }
}

main();



