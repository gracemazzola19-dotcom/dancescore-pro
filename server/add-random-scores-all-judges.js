const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function addRandomScoresFromAllJudges() {
  console.log('🎯 ADDING RANDOM SCORES FROM ALL JUDGES');
  console.log('========================================');
  
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
    
    // Get all judges
    const judgesSnapshot = await db.collection('judges')
      .where('active', '==', true)
      .get();
    
    console.log(`✅ Found ${judgesSnapshot.size} active judges`);
    
    if (judgesSnapshot.size === 0) {
      console.log('❌ No active judges found');
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
    
    // Generate random scores for each judge and dancer combination
    console.log('\n🎲 Generating random scores...');
    
    let totalScoresAdded = 0;
    const judges = judgesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancerId = dancerDoc.id;
      const dancerData = dancerDoc.data();
      
      console.log(`   Processing ${dancerData.name} (#${dancerData.auditionNumber})...`);
      
      for (const judge of judges) {
        // Generate random scores (9-31 range as requested)
        const scores = {
          kick: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1.0-5.0
          jump: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1.0-5.0
          turn: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1.0-5.0
          performance: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1.0-5.0
          execution: Math.round((Math.random() * 8 + 2) * 10) / 10, // 2.0-10.0
          technique: Math.round((Math.random() * 8 + 2) * 10) / 10  // 2.0-10.0
        };
        
        // Calculate total score
        const totalScore = scores.kick + scores.jump + scores.turn + scores.performance + scores.execution + scores.technique;
        
        // Ensure total is in 9-31 range
        if (totalScore < 9) {
          // Boost scores to reach minimum
          const boost = (9 - totalScore) / 6;
          scores.kick += boost;
          scores.jump += boost;
          scores.turn += boost;
          scores.performance += boost;
          scores.execution += boost;
          scores.technique += boost;
        } else if (totalScore > 31) {
          // Reduce scores to reach maximum
          const reduction = (totalScore - 31) / 6;
          scores.kick -= reduction;
          scores.jump -= reduction;
          scores.turn -= reduction;
          scores.performance -= reduction;
          scores.execution -= reduction;
          scores.technique -= reduction;
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
          scores: scores,
          total: Math.round(finalTotal * 10) / 10,
          comments: `Random score generated for testing`,
          submitted: true,
          timestamp: new Date()
        };
        
        // Add to database
        await db.collection('scores').add(scoreData);
        totalScoresAdded++;
        
        console.log(`     ${judge.name || judge.email}: ${finalTotal.toFixed(1)} (${scores.kick}+${scores.jump}+${scores.turn}+${scores.performance}+${scores.execution}+${scores.technique})`);
      }
    }
    
    console.log('\n🎉 SCORE GENERATION COMPLETE!');
    console.log('==============================');
    console.log(`✅ Added ${totalScoresAdded} scores`);
    console.log(`✅ ${judges.length} judges × ${dancersSnapshot.size} dancers`);
    console.log(`✅ All scores in 9-31 range`);
    console.log(`✅ Ready for deliberations!`);
    
  } catch (error) {
    console.error('❌ Error generating scores:', error);
    throw error;
  }
}

// Run the score generation
addRandomScoresFromAllJudges()
  .then(() => {
    console.log('\n🚀 Score generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Score generation failed:', error);
    process.exit(1);
  });


