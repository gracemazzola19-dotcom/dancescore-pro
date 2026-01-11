#!/usr/bin/env node

/**
 * Firebase Migration Script
 * 
 * This script helps migrate data from local database to new Firebase database
 * 
 * Usage: node scripts/migrate-to-firebase.js
 */

const LocalDatabase = require('../local-database');
const admin = require('firebase-admin');

async function migrateToFirebase() {
  console.log('🔄 Starting Firebase Migration...\n');
  
  try {
    // Initialize Firebase
    if (!admin.apps.length) {
      const serviceAccount = require('../service-account-key.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    const firebaseDb = admin.firestore();
    console.log('✅ Firebase initialized successfully\n');
    
    // Initialize local database
    const localDb = new LocalDatabase();
    console.log('✅ Local database initialized\n');
    
    // Migrate judges
    console.log('👥 Migrating judges...');
    const judgesSnapshot = await localDb.collection('judges').get();
    let judgesMigrated = 0;
    
    for (const doc of judgesSnapshot.docs) {
      const judgeData = doc.data();
      await firebaseDb.collection('judges').doc(doc.id).set(judgeData);
      judgesMigrated++;
    }
    console.log(`✅ Migrated ${judgesMigrated} judges\n`);
    
    // Migrate settings
    console.log('⚙️ Migrating settings...');
    const settingsSnapshot = await localDb.collection('settings').get();
    let settingsMigrated = 0;
    
    for (const doc of settingsSnapshot.docs) {
      const settingsData = doc.data();
      if (doc.id && typeof doc.id === 'string' && doc.id.trim() !== '') {
        await firebaseDb.collection('settings').doc(doc.id).set(settingsData);
        settingsMigrated++;
      }
    }
    console.log(`✅ Migrated ${settingsMigrated} settings\n`);
    
    // Migrate auditions (if any)
    console.log('🎭 Migrating auditions...');
    const auditionsSnapshot = await localDb.collection('auditions').get();
    let auditionsMigrated = 0;
    
    for (const doc of auditionsSnapshot.docs) {
      const auditionData = doc.data();
      await firebaseDb.collection('auditions').doc(doc.id).set(auditionData);
      auditionsMigrated++;
    }
    console.log(`✅ Migrated ${auditionsMigrated} auditions\n`);
    
    // Migrate dancers (if any)
    console.log('💃 Migrating dancers...');
    const dancersSnapshot = await localDb.collection('dancers').get();
    let dancersMigrated = 0;
    
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      await firebaseDb.collection('dancers').doc(doc.id).set(dancerData);
      dancersMigrated++;
    }
    console.log(`✅ Migrated ${dancersMigrated} dancers\n`);
    
    // Migrate deliberations (if any)
    console.log('🤔 Migrating deliberations...');
    const deliberationsSnapshot = await localDb.collection('deliberations').get();
    let deliberationsMigrated = 0;
    
    for (const doc of deliberationsSnapshot.docs) {
      const deliberationsData = doc.data();
      await firebaseDb.collection('deliberations').doc(doc.id).set(deliberationsData);
      deliberationsMigrated++;
    }
    console.log(`✅ Migrated ${deliberationsMigrated} deliberations\n`);
    
    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Migration Summary:');
    console.log(`   Judges: ${judgesMigrated}`);
    console.log(`   Settings: ${settingsMigrated}`);
    console.log(`   Auditions: ${auditionsMigrated}`);
    console.log(`   Dancers: ${dancersMigrated}`);
    console.log(`   Deliberations: ${deliberationsMigrated}\n`);
    
    console.log('✅ Your data has been successfully migrated to Firebase!');
    console.log('🔧 Next step: Update database-adapter.js to use Firebase');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateToFirebase();
