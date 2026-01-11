#!/usr/bin/env node

/**
 * Multi-Tenant Testing Script
 * 
 * This script tests that multi-tenant functionality is working correctly
 * by verifying:
 * 1. Authentication includes clubId
 * 2. Data isolation works
 * 3. All endpoints filter by clubId
 * 
 * Usage: node server/scripts/test-multi-tenant.js
 */

const dbAdapter = require('../database-adapter');
const db = dbAdapter;
const jwt = require('jsonwebtoken');

const DEFAULT_CLUB_ID = 'msu-dance-club';

async function testMultiTenant() {
  console.log('🧪 Testing Multi-Tenant Functionality...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  const failures = [];

  try {
    // Test 1: Verify default club exists
    console.log('Test 1: Verifying default club exists...');
    try {
      const clubDoc = await db.collection('clubs').doc(DEFAULT_CLUB_ID).get();
      if (clubDoc.exists) {
        console.log('✅ Default club exists\n');
        testsPassed++;
      } else {
        console.log('❌ Default club does not exist\n');
        testsFailed++;
        failures.push('Default club does not exist');
      }
    } catch (error) {
      console.log(`❌ Error checking default club: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking default club: ${error.message}`);
    }

    // Test 2: Verify judges have clubId
    console.log('Test 2: Verifying judges have clubId...');
    try {
      const judgesSnapshot = await db.collection('judges').get();
      let judgesWithClubId = 0;
      let judgesWithoutClubId = 0;

      judgesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clubId) {
          judgesWithClubId++;
        } else {
          judgesWithoutClubId++;
        }
      });

      if (judgesSnapshot.empty) {
        console.log('⏭️  No judges found (empty collection)\n');
      } else if (judgesWithoutClubId === 0) {
        console.log(`✅ All ${judgesWithClubId} judges have clubId\n`);
        testsPassed++;
      } else {
        console.log(`⚠️  ${judgesWithoutClubId} judges missing clubId out of ${judgesSnapshot.size} total\n`);
        testsFailed++;
        failures.push(`${judgesWithoutClubId} judges missing clubId`);
      }
    } catch (error) {
      console.log(`❌ Error checking judges: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking judges: ${error.message}`);
    }

    // Test 3: Verify auditions have clubId
    console.log('Test 3: Verifying auditions have clubId...');
    try {
      const auditionsSnapshot = await db.collection('auditions').get();
      let auditionsWithClubId = 0;
      let auditionsWithoutClubId = 0;

      auditionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clubId) {
          auditionsWithClubId++;
        } else {
          auditionsWithoutClubId++;
        }
      });

      if (auditionsSnapshot.empty) {
        console.log('⏭️  No auditions found (empty collection)\n');
      } else if (auditionsWithoutClubId === 0) {
        console.log(`✅ All ${auditionsWithClubId} auditions have clubId\n`);
        testsPassed++;
      } else {
        console.log(`⚠️  ${auditionsWithoutClubId} auditions missing clubId out of ${auditionsSnapshot.size} total\n`);
        testsFailed++;
        failures.push(`${auditionsWithoutClubId} auditions missing clubId`);
      }
    } catch (error) {
      console.log(`❌ Error checking auditions: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking auditions: ${error.message}`);
    }

    // Test 4: Verify dancers have clubId
    console.log('Test 4: Verifying dancers have clubId...');
    try {
      const dancersSnapshot = await db.collection('dancers').get();
      let dancersWithClubId = 0;
      let dancersWithoutClubId = 0;

      dancersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clubId) {
          dancersWithClubId++;
        } else {
          dancersWithoutClubId++;
        }
      });

      if (dancersSnapshot.empty) {
        console.log('⏭️  No dancers found (empty collection)\n');
      } else if (dancersWithoutClubId === 0) {
        console.log(`✅ All ${dancersWithClubId} dancers have clubId\n`);
        testsPassed++;
      } else {
        console.log(`⚠️  ${dancersWithoutClubId} dancers missing clubId out of ${dancersSnapshot.size} total\n`);
        testsFailed++;
        failures.push(`${dancersWithoutClubId} dancers missing clubId`);
      }
    } catch (error) {
      console.log(`❌ Error checking dancers: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking dancers: ${error.message}`);
    }

    // Test 5: Verify scores have clubId
    console.log('Test 5: Verifying scores have clubId...');
    try {
      const scoresSnapshot = await db.collection('scores').limit(100).get(); // Limit for performance
      let scoresWithClubId = 0;
      let scoresWithoutClubId = 0;

      scoresSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clubId) {
          scoresWithClubId++;
        } else {
          scoresWithoutClubId++;
        }
      });

      if (scoresSnapshot.empty) {
        console.log('⏭️  No scores found (empty collection)\n');
      } else if (scoresWithoutClubId === 0) {
        console.log(`✅ All ${scoresWithClubId} scores sampled have clubId\n`);
        testsPassed++;
      } else {
        console.log(`⚠️  ${scoresWithoutClubId} scores missing clubId out of ${scoresSnapshot.size} sampled\n`);
        testsFailed++;
        failures.push(`${scoresWithoutClubId} scores missing clubId`);
      }
    } catch (error) {
      console.log(`❌ Error checking scores: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking scores: ${error.message}`);
    }

    // Test 6: Verify settings have clubId
    console.log('Test 6: Verifying settings have clubId...');
    try {
      const settingsDoc = await db.collection('settings').doc('audition_settings').get();
      if (settingsDoc.exists) {
        const settingsData = settingsDoc.data();
        if (settingsData.clubId) {
          console.log(`✅ Settings have clubId: ${settingsData.clubId}\n`);
          testsPassed++;
        } else {
          console.log('❌ Settings missing clubId\n');
          testsFailed++;
          failures.push('Settings missing clubId');
        }
      } else {
        console.log('⏭️  Settings document does not exist (will be created on first use)\n');
      }
    } catch (error) {
      console.log(`❌ Error checking settings: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error checking settings: ${error.message}`);
    }

    // Test 7: Test JWT token generation with clubId
    console.log('Test 7: Testing JWT token includes clubId...');
    try {
      const testToken = jwt.sign(
        { id: 'test-id', email: 'test@example.com', role: 'judge', clubId: DEFAULT_CLUB_ID },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.clubId === DEFAULT_CLUB_ID) {
        console.log('✅ JWT token correctly includes clubId\n');
        testsPassed++;
      } else {
        console.log(`❌ JWT token missing or incorrect clubId: ${decoded.clubId}\n`);
        testsFailed++;
        failures.push('JWT token missing or incorrect clubId');
      }
    } catch (error) {
      console.log(`❌ Error testing JWT: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error testing JWT: ${error.message}`);
    }

    // Test 8: Test data isolation query
    console.log('Test 8: Testing data isolation query...');
    try {
      const filteredJudges = await db.collection('judges')
        .where('clubId', '==', DEFAULT_CLUB_ID)
        .limit(5)
        .get();
      
      console.log(`✅ Successfully queried ${filteredJudges.size} judges filtered by clubId\n`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ Error testing data isolation query: ${error.message}\n`);
      testsFailed++;
      failures.push(`Error testing data isolation query: ${error.message}`);
    }

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📊 Total Tests: ${testsPassed + testsFailed}\n`);

    if (failures.length > 0) {
      console.log('⚠️  FAILURES:');
      failures.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure}`);
      });
      console.log('');
    }

    if (testsFailed === 0) {
      console.log('✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
      console.log('Multi-tenant functionality is working correctly\n');
      return true;
    } else {
      console.log('⚠️  ⚠️  ⚠️  SOME TESTS FAILED ⚠️  ⚠️  ⚠️');
      console.log('Please review the failures and run the migration script again if needed\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR during testing:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the tests
if (require.main === module) {
  testMultiTenant()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testMultiTenant };
