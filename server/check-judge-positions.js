const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function checkJudgePositions() {
  console.log('🔍 CHECKING JUDGE POSITIONS');
  console.log('============================');
  
  try {
    const judgesSnapshot = await db.collection('judges')
      .where('active', '==', true)
      .get();
    
    console.log(`✅ Found ${judgesSnapshot.size} active judges`);
    
    console.log('\n📋 Judge login credentials:');
    judgesSnapshot.docs.forEach(doc => {
      const judge = doc.data();
      console.log(`   Email: ${judge.email}`);
      console.log(`   Password (position): ${judge.position}`);
      console.log(`   Name: ${judge.name}`);
      console.log('   ---');
    });
    
    // Check if Grace is an admin
    const graceJudge = judgesSnapshot.docs.find(doc => 
      doc.data().email === 'gmazzola.sec@msudc.com'
    );
    
    if (graceJudge) {
      console.log('\n👑 Grace (Admin) login:');
      console.log(`   Email: ${graceJudge.data().email}`);
      console.log(`   Password: ${graceJudge.data().position}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking judge positions:', error);
    throw error;
  }
}

// Run the check
checkJudgePositions()
  .then(() => {
    console.log('\n🚀 Judge position check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Judge position check failed:', error);
    process.exit(1);
  });


