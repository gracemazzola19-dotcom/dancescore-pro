const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function quickSystemCheck() {
  console.log('🔍 QUICK SYSTEM CHECK');
  console.log('====================');
  
  try {
    // Check auditions
    const auditionsSnapshot = await db.collection('auditions').get();
    console.log(`✅ Auditions: ${auditionsSnapshot.size} found`);
    
    if (auditionsSnapshot.size > 0) {
      const audition = auditionsSnapshot.docs[0];
      const auditionId = audition.id;
      const auditionData = audition.data();
      
      console.log(`   - "${auditionData.name}" (${auditionData.status})`);
      
      // Check dancers
      const dancersSnapshot = await db.collection('dancers')
        .where('auditionId', '==', auditionId)
        .get();
      console.log(`✅ Dancers: ${dancersSnapshot.size} found`);
      
      // Check scores
      const scoresSnapshot = await db.collection('scores')
        .where('auditionId', '==', auditionId)
        .get();
      console.log(`✅ Scores: ${scoresSnapshot.size} found`);
      
      // Check club members
      const clubMembersSnapshot = await db.collection('club_members')
        .where('auditionId', '==', auditionId)
        .get();
      console.log(`✅ Club Members: ${clubMembersSnapshot.size} found`);
      
      console.log(`\n📋 CURRENT STATE:`);
      console.log(`   - Audition Status: ${auditionData.status}`);
      console.log(`   - Dancers: ${dancersSnapshot.size}`);
      console.log(`   - Scores: ${scoresSnapshot.size}`);
      console.log(`   - Club Members: ${clubMembersSnapshot.size}`);
      
      console.log(`\n🎯 WHAT YOU CAN DO:`);
      if (auditionData.status === 'active') {
        console.log('1. ✅ Login as JUDGE to submit scores');
        console.log('2. ✅ Login as ADMIN to view/manage');
        console.log('3. ✅ Submit deliberations when ready');
      } else if (auditionData.status === 'completed') {
        console.log('1. ✅ View completed audition');
        console.log('2. ✅ Check club members');
        console.log('3. ✅ Create new audition if needed');
      }
      
    } else {
      console.log('❌ No auditions found - need to create one');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickSystemCheck()
  .then(() => {
    console.log('\n🚀 System check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });


