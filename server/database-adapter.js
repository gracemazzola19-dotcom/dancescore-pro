const admin = require('firebase-admin');

// Initialize Firebase Admin
let firebaseDb = null;
try {
  if (!admin.apps.length) {
    let serviceAccount;
    
    // Try to read from environment variable first (for Heroku/cloud deployment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.log('📦 Loading Firebase credentials from environment variable');
      serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } else {
      // Fallback to file (for local development)
      console.log('📦 Loading Firebase credentials from file');
      serviceAccount = require('./service-account-key.json');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  firebaseDb = admin.firestore();
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.log('❌ Firebase initialization failed:', error.message);
  throw error;
}

console.log('🔧 USING FIREBASE DATABASE - Clean Firebase-only setup');
console.log('📊 Using FIREBASE database');

// Firebase-only database adapter
class DatabaseAdapter {
  constructor() {
    this._firebaseDb = firebaseDb;
    console.log(`📊 Using FIREBASE database`);
  }

  get db() {
    return this._firebaseDb || firebaseDb;
  }

  // Collection method
  collection(name) {
    return (this._firebaseDb || firebaseDb).collection(name);
  }

  // Batch operations
  batch() {
    return firebaseDb.batch();
  }

  // Transaction support
  runTransaction(updateFunction) {
    return firebaseDb.runTransaction(updateFunction);
  }

  // Field value helpers
  get FieldValue() {
    return firebaseDb.FieldValue;
  }
}

// Create and export a single instance
const dbAdapter = new DatabaseAdapter();
module.exports = dbAdapter;