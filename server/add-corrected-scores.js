const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function addCorrectedRandomScores() {
  console.log('🎯 ADDING CORRECTED RANDOM SCORES');
  console.log('=================================');
  
  try {
    // Get the active audition
    const auditionsSnapshot = await db.collection('auditions')
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (auditionsSnapshot.empty) {
      console.log('❌ No active audition found');
      return;
    }
    
    const auditionDoc = auditionsSnapshot.docs[0];
    const auditionId = auditionDoc.id;
    const auditionData = auditionDoc.data();
    
    console.log(`✅ Found active audition: "${auditionData.name}"`);
    console.log(`   Audition ID: ${auditionId}`);
    
    // Get judges (excluding Hallie and Izzy)
    const judgesSnapshot = await db.collection('judges')
      .where('active', '==', true)
      .get();
    
    // Filter out Hallie and Izzy
    const excludedJudges = ['Hallie', 'Izzy'];
    const judges = judgesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(judge => !excludedJudges.includes(judge.name));
    
    console.log(`✅ Found ${judges.length} judges (excluding Hallie and Izzy)`);
    console.log(`   Judges: ${judges.map(j => j.name).join(', ')}`);
    
    if (judges.length === 0) {
      console.log('❌ No judges found');
      return;
    }
    
    // Get all dancers for this audition
    const dancersSnapshot = await db.collection('dancers')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`✅ Found ${dancersSnapshot.size} dancers`);
    
    if (dancersSnapshot.size === 0) {
      console.log('❌ No dancers found for this audition');
      return;
    }
    
    // Clear existing scores for this audition
    console.log('\n🧹 Clearing existing scores...');
    const existingScoresSnapshot = await db.collection('scores')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`   Found ${existingScoresSnapshot.size} existing scores to clear`);
    
    const batch = db.batch();
    existingScoresSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('✅ Existing scores cleared');
    
    // Generate corrected random scores
    console.log('\n🎲 Generating corrected random scores...');
    
    let totalScoresAdded = 0;
    
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancerId = dancerDoc.id;
      const dancerData = dancerDoc.data();
      
      console.log(`   Processing ${dancerData.name} (#${dancerData.auditionNumber})...`);
      
      for (const judge of judges) {
        // Generate corrected random scores
        const scores = {
          kick: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          jump: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          turn: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          performance: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          execution: Math.round((Math.random() * 7 + 1) * 10) / 10, // 1.0-8.0
          technique: Math.round((Math.random() * 7 + 1) * 10) / 10  // 1.0-8.0
        };
        
        // Calculate total score
        const totalScore = scores.kick + scores.jump + scores.turn + scores.performance + scores.execution + scores.technique;
        
        // Ensure total is in 9-31 range
        if (totalScore < 9) {
          // Boost scores to reach minimum
          const boost = (9 - totalScore) / 6;
          scores.kick = Math.min(4, scores.kick + boost);
          scores.jump = Math.min(4, scores.jump + boost);
          scores.turn = Math.min(4, scores.turn + boost);
          scores.performance = Math.min(4, scores.performance + boost);
          scores.execution = Math.min(8, scores.execution + boost);
          scores.technique = Math.min(8, scores.technique + boost);
        } else if (totalScore > 31) {
          // Reduce scores to reach maximum
          const reduction = (totalScore - 31) / 6;
          scores.kick = Math.max(1, scores.kick - reduction);
          scores.jump = Math.max(1, scores.jump - reduction);
          scores.turn = Math.max(1, scores.turn - reduction);
          scores.performance = Math.max(1, scores.performance - reduction);
          scores.execution = Math.max(1, scores.execution - reduction);
          scores.technique = Math.max(1, scores.technique - reduction);
        }
        
        // Round to 1 decimal place
        scores.kick = Math.round(scores.kick * 10) / 10;
        scores.jump = Math.round(scores.jump * 10) / 10;
        scores.turn = Math.round(scores.turn * 10) / 10;
        scores.performance = Math.round(scores.performance * 10) / 10;
        scores.execution = Math.round(scores.execution * 10) / 10;
        scores.technique = Math.round(scores.technique * 10) / 10;
        
        const finalTotal = scores.kick + scores.jump + scores.turn + scores.performance + scores.execution + scores.technique;
        
        // Create score document
        const scoreData = {
          dancerId: dancerId,
          auditionId: auditionId,
          judgeId: judge.id,
          judgeName: judge.name || judge.email || judge.id,
          kick: scores.kick,
          jump: scores.jump,
          turn: scores.turn,
          performance: scores.performance,
          execution: scores.execution,
          technique: scores.technique,
          total: Math.round(finalTotal * 10) / 10,
          comments: `Corrected random score generated for testing`,
          submitted: true,
          timestamp: new Date()
        };
        
        // Add to database
        await db.collection('scores').add(scoreData);
        totalScoresAdded++;
        
        console.log(`     ${judge.name}: ${finalTotal.toFixed(1)} (${scores.kick}+${scores.jump}+${scores.turn}+${scores.performance}+${scores.execution}+${scores.technique})`);
      }
    }
    
    console.log('\n🎉 CORRECTED SCORE GENERATION COMPLETE!');
    console.log('======================================');
    console.log(`✅ Added ${totalScoresAdded} scores`);
    console.log(`✅ ${judges.length} judges × ${dancersSnapshot.size} dancers`);
    console.log(`✅ Correct scoring ranges: Kick/Jump/Turn/Performance (1-4), Execution/Technique (1-8)`);
    console.log(`✅ Excluded Hallie and Izzy`);
    console.log(`✅ All scores in 9-31 range`);
    
    // Verify scores were added
    console.log('\n🔍 Verifying scores were added...');
    const verifySnapshot = await db.collection('scores')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`✅ Verification: ${verifySnapshot.size} scores found in database`);
    
  } catch (error) {
    console.error('❌ Error generating corrected scores:', error);
    throw error;
  }
}

// Run the corrected score generation
addCorrectedRandomScores()
  .then(() => {
    console.log('\n🚀 Corrected score generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Corrected score generation failed:', error);
    process.exit(1);
  });
