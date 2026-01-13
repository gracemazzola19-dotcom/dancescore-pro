const dbAdapter = require('./database-adapter');
const db = dbAdapter;
const admin = require('firebase-admin');

async function resubmitTestAuditionScores(clubId = 'msu-dance-club', auditionId = null) {
  console.log('🔄 RESUBMITTING SCORES FOR TEST AUDITION');
  console.log('==========================================');
  console.log(`Club ID: ${clubId}`);
  
  try {
    // Find the active test audition if auditionId not provided
    let targetAuditionId = auditionId;
    
    if (!targetAuditionId) {
      console.log('1. Finding active test audition...');
      const auditionsSnapshot = await db.collection('auditions')
        .where('clubId', '==', clubId)
        .where('status', '==', 'active')
        .get();
      
      // Look for test audition
      const testAudition = auditionsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.name && data.name.includes('Test Audition');
      });
      
      if (!testAudition) {
        throw new Error('No active test audition found. Please provide auditionId or create a test audition first.');
      }
      
      targetAuditionId = testAudition.id;
      console.log(`✅ Found test audition: ${targetAuditionId} - "${testAudition.data().name}"`);
    } else {
      console.log(`✅ Using provided audition ID: ${targetAuditionId}`);
    }
    
    // Get all dancers for this audition
    console.log('\n2. Fetching dancers for this audition...');
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', targetAuditionId)
      .get();
    
    if (dancersSnapshot.empty) {
      throw new Error(`No dancers found for audition ${targetAuditionId}`);
    }
    
    const dancers = dancersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${dancers.length} dancers`);
    
    // Get all active judges (need 9)
    console.log('\n3. Fetching judges...');
    const judgesSnapshot = await db.collection('judges')
      .where('clubId', '==', clubId)
      .where('active', '==', true)
      .get();
    
    let judges = [];
    if (judgesSnapshot.size >= 9) {
      judges = judgesSnapshot.docs.slice(0, 9).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      // Fallback: get all active judges
      const allJudgesSnapshot = await db.collection('judges')
        .where('active', '==', true)
        .get();
      judges = allJudgesSnapshot.docs.slice(0, 9).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    if (judges.length < 9) {
      console.log(`⚠️  Warning: Only found ${judges.length} active judges (need 9)`);
      console.log('   Creating test judges...');
      
      // Create test judges if we don't have enough
      const testJudgeNames = ['Judge 1', 'Judge 2', 'Judge 3', 'Judge 4', 'Judge 5', 'Judge 6', 'Judge 7', 'Judge 8', 'Judge 9'];
      const existingJudgeNames = judges.map(j => j.name);
      
      for (let i = 0; i < 9; i++) {
        if (i < judges.length) continue;
        
        const judgeData = {
          name: testJudgeNames[i],
          email: `judge${i + 1}@test.com`,
          role: 'judge',
          active: true,
          clubId: clubId,
          createdAt: new Date()
        };
        
        const judgeRef = await db.collection('judges').add(judgeData);
        judges.push({
          id: judgeRef.id,
          ...judgeData
        });
      }
    }
    
    console.log(`✅ Using ${judges.length} judges: ${judges.map(j => j.name).join(', ')}`);
    
    // Delete existing scores for these dancers (handle Firestore batch limit of 500)
    console.log('\n4. Deleting existing scores...');
    const existingScoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', targetAuditionId)
      .get();
    
    let deleteCount = 0;
    if (existingScoresSnapshot.size > 0) {
      // Firestore batch limit is 500, so we need to batch in chunks
      const allDocs = existingScoresSnapshot.docs;
      const batchSize = 500;
      
      for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = allDocs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
          deleteCount++;
        });
        
        await batch.commit();
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1} (${batchDocs.length} scores)`);
      }
      
      console.log(`✅ Deleted ${deleteCount} existing scores`);
    } else {
      console.log(`ℹ️  No existing scores to delete`);
    }
    
    // Also clear dancer scores arrays
    console.log('\n4b. Clearing dancer scores arrays...');
    const updateBatch = db.batch();
    let updateCount = 0;
    dancers.forEach(dancer => {
      updateBatch.update(db.collection('dancers').doc(dancer.id), {
        scores: []
      });
      updateCount++;
    });
    
    if (updateCount > 0) {
      await updateBatch.commit();
      console.log(`✅ Cleared scores arrays for ${updateCount} dancers`);
    }
    
    // Generate new scores for each dancer from each judge
    console.log('\n5. Generating new scores (9 judges × ' + dancers.length + ' dancers)...');
    let totalScoresAdded = 0;
    
    for (const dancer of dancers) {
      console.log(`   Processing ${dancer.name} (#${dancer.auditionNumber})...`);
      
      for (const judge of judges) {
        // Generate realistic random scores (typically 9-31 range)
        const scores = {
          kick: Math.round((Math.random() * 2.5 + 1.5) * 10) / 10, // 1.5 - 4.0
          jump: Math.round((Math.random() * 2.5 + 1.5) * 10) / 10, // 1.5 - 4.0
          turn: Math.round((Math.random() * 2.5 + 1.5) * 10) / 10, // 1.5 - 4.0
          performance: Math.round((Math.random() * 2.5 + 1.5) * 10) / 10, // 1.5 - 4.0
          execution: Math.round((Math.random() * 5 + 4) * 10) / 10, // 4.0 - 9.0
          technique: Math.round((Math.random() * 5 + 4) * 10) / 10  // 4.0 - 9.0
        };
        
        const total = scores.kick + scores.jump + scores.turn + scores.performance + scores.execution + scores.technique;
        
        const scoreData = {
          dancerId: dancer.id,
          auditionId: targetAuditionId, // CRITICAL: Ensure auditionId is set
          clubId: clubId,
          judgeId: judge.id,
          judgeName: judge.name || judge.email || judge.id,
          scores: scores,
          comments: `Resubmitted test score from ${judge.name}`,
          submitted: true,
          timestamp: new Date()
        };
        
        const scoreRef = await db.collection('scores').add(scoreData);
        
        // Update dancer's scores array
        await db.collection('dancers').doc(dancer.id).update({
          scores: admin.firestore.FieldValue.arrayUnion(scoreRef.id)
        });
        
        // Verify the score was saved correctly
        const savedScore = await scoreRef.get();
        const savedData = savedScore.data();
        if (savedData.auditionId !== targetAuditionId) {
          console.error(`   ⚠️  WARNING: Score ${scoreRef.id} saved with wrong auditionId: ${savedData.auditionId} (expected: ${targetAuditionId})`);
        } else {
          console.log(`      ✅ Score ${scoreRef.id} saved with correct auditionId: ${targetAuditionId}`);
        }
        
        totalScoresAdded++;
      }
      
      console.log(`      ✅ Added 9 scores for ${dancer.name}`);
    }
    
    console.log('\n🎉 SCORE RESUBMISSION COMPLETE!');
    console.log('===================================');
    console.log(`✅ Audition ID: ${targetAuditionId}`);
    console.log(`✅ Dancers: ${dancers.length}`);
    console.log(`✅ Judges: ${judges.length}`);
    console.log(`✅ Total scores added: ${totalScoresAdded}`);
    console.log(`✅ All scores have auditionId: ${targetAuditionId}`);
    console.log(`✅ All scores marked as submitted: true`);
    console.log(`\n✨ Scores are now ready to view on admin dashboard!`);
    
    return {
      auditionId: targetAuditionId,
      dancersCount: dancers.length,
      judgesCount: judges.length,
      scoresCount: totalScoresAdded,
      deletedScoresCount: deleteCount
    };
    
  } catch (error) {
    console.error('❌ Error resubmitting scores:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  const auditionId = process.argv[2] || null;
  resubmitTestAuditionScores('msu-dance-club', auditionId)
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = resubmitTestAuditionScores;
