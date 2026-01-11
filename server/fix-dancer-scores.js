const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function fixDancerScoresArrays() {
  console.log('🔧 FIXING DANCER SCORES ARRAYS');
  console.log('===============================');
  
  try {
    // Get all dancers
    const dancersSnapshot = await db.collection('dancers').get();
    console.log(`✅ Found ${dancersSnapshot.size} dancers`);
    
    let fixedCount = 0;
    
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancerId = dancerDoc.id;
      const dancerData = dancerDoc.data();
      
      console.log(`   Processing ${dancerData.name} (${dancerId})...`);
      
      // Get all scores for this dancer
      const scoresSnapshot = await db.collection('scores')
        .where('dancerId', '==', dancerId)
        .get();
      
      if (scoresSnapshot.size > 0) {
        // Create array of score IDs
        const scoreIds = scoresSnapshot.docs.map(doc => doc.id);
        
        // Update dancer with correct scores array
        await db.collection('dancers').doc(dancerId).update({
          scores: scoreIds
        });
        
        console.log(`     ✅ Fixed: ${scoreIds.length} scores`);
        fixedCount++;
      } else {
        console.log(`     ⚠️  No scores found`);
      }
    }
    
    console.log('\n🎉 DANCER SCORES ARRAYS FIXED!');
    console.log('===============================');
    console.log(`✅ Fixed ${fixedCount} dancers`);
    
    // Verify the fix
    console.log('\n🔍 VERIFICATION:');
    const verifySnapshot = await db.collection('dancers').limit(3).get();
    for (const doc of verifySnapshot.docs) {
      const dancer = doc.data();
      console.log(`   ${dancer.name}: ${dancer.scores ? dancer.scores.length : 0} scores`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing dancer scores arrays:', error);
    throw error;
  }
}

// Run the fix
fixDancerScoresArrays()
  .then(() => {
    console.log('\n🚀 Dancer scores arrays fix complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Dancer scores arrays fix failed:', error);
    process.exit(1);
  });


