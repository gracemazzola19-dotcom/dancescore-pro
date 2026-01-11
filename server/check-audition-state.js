const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function checkAuditionState() {
  try {
    console.log('🔍 CHECKING AUDITION STATE');
    console.log('==========================');
    
    // Find the Spring 2025 audition
    const auditionsSnapshot = await db.collection('auditions')
      .where('name', '==', 'Spring 2025 Dance Auditions')
      .limit(1)
      .get();
    
    if (auditionsSnapshot.empty) {
      console.log('❌ No Spring 2025 audition found');
      return;
    }
    
    const auditionDoc = auditionsSnapshot.docs[0];
    const auditionId = auditionDoc.id;
    const auditionData = auditionDoc.data();
    
    console.log(`✅ Found audition: "${auditionData.name}"`);
    console.log(`   Status: ${auditionData.status}`);
    console.log(`   ID: ${auditionId}`);
    
    // Check dancers
    const dancersSnapshot = await db.collection('dancers')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`\n👥 DANCERS: ${dancersSnapshot.size} total`);
    
    // Check scores for each dancer
    let dancersWithScores = 0;
    let totalScores = 0;
    
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancerId = dancerDoc.id;
      const dancerData = dancerDoc.data();
      
      const scoresSnapshot = await db.collection('scores')
        .where('dancerId', '==', dancerId)
        .get();
      
      if (scoresSnapshot.size > 0) {
        dancersWithScores++;
        totalScores += scoresSnapshot.size;
        
        // Show judge breakdown
        const judges = [];
        for (const scoreDoc of scoresSnapshot.docs) {
          const scoreData = scoreDoc.data();
          judges.push(scoreData.judgeName);
        }
        
        console.log(`   ${dancerData.name} (#${dancerData.auditionNumber}): ${scoresSnapshot.size} scores from [${judges.join(', ')}]`);
      } else {
        console.log(`   ${dancerData.name} (#${dancerData.auditionNumber}): NO SCORES`);
      }
    }
    
    console.log(`\n📊 SCORE SUMMARY:`);
    console.log(`   Dancers with scores: ${dancersWithScores}/${dancersSnapshot.size}`);
    console.log(`   Total scores submitted: ${totalScores}`);
    
    // Check club members
    const clubMembersSnapshot = await db.collection('club_members')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`\n🏛️ CLUB MEMBERS: ${clubMembersSnapshot.size} transferred`);
    
    // Check deliberations
    const deliberationsSnapshot = await db.collection('deliberations')
      .where('auditionId', '==', auditionId)
      .get();
    
    console.log(`\n🤔 DELIBERATIONS: ${deliberationsSnapshot.size} records`);
    
    console.log(`\n📋 WORKFLOW STATUS:`);
    if (auditionData.status === 'completed') {
      console.log('✅ Audition is COMPLETED - deliberations have been submitted');
    } else if (auditionData.status === 'active') {
      console.log('🔄 Audition is ACTIVE - judges can still submit scores');
    } else {
      console.log(`⚠️ Audition status: ${auditionData.status}`);
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    if (auditionData.status === 'active' && dancersWithScores < dancersSnapshot.size) {
      console.log('1. Continue submitting scores for remaining dancers');
      console.log('2. When all scores are submitted, go to Admin → Deliberations');
      console.log('3. Assign levels and submit deliberations');
      console.log('4. This will transfer dancers to club members');
    } else if (auditionData.status === 'active' && dancersWithScores === dancersSnapshot.size) {
      console.log('1. All scores submitted! Go to Admin → Deliberations');
      console.log('2. Assign levels to dancers');
      console.log('3. Submit deliberations to transfer to club members');
    } else if (auditionData.status === 'completed') {
      console.log('✅ Audition completed - dancers already transferred to club members');
    }
    
  } catch (error) {
    console.error('❌ Error checking audition state:', error);
  }
}

checkAuditionState()
  .then(() => {
    console.log('\n🚀 Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });


