const dbAdapter = require('./database-adapter');
const db = dbAdapter;

// Sample data for generating realistic dancers
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Benjamin',
  'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Mia', 'Alexander', 'Harper', 'Mason', 'Evelyn', 'Michael',
  'Abigail', 'Ethan', 'Emily', 'Daniel', 'Elizabeth', 'Jacob', 'Sofia', 'Logan', 'Avery', 'Jackson'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const majors = [
  'Computer Science', 'Business Administration', 'Psychology', 'Biology', 'Engineering', 'Communications',
  'Education', 'Nursing', 'Marketing', 'Finance', 'Art', 'Music', 'Theater', 'Dance', 'Sports Medicine'
];

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const dancerGroups = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'];

async function createTestAuditionWith20Dancers(clubId = 'msu-dance-club') {
  console.log('🎯 CREATING TEST AUDITION WITH 20 DANCERS');
  console.log('==========================================');
  console.log(`Club ID: ${clubId}`);
  
  try {
    // First, create a new audition
    console.log('1. Creating new audition...');
    const auditionData = {
      name: 'Test Audition - 20 Dancers',
      date: new Date().toISOString().split('T')[0], // Today's date
      status: 'active',
      clubId: clubId,
      createdAt: new Date(),
      createdBy: 'test-script',
      dancers: 0
    };
    
    const auditionRef = await db.collection('auditions').add(auditionData);
    const auditionId = auditionRef.id;
    console.log(`✅ Created audition: ${auditionId}`);
    
    // Get all active judges (need at least 9)
    const judgesSnapshot = await db.collection('judges')
      .where('clubId', '==', clubId)
      .where('active', '==', true)
      .get();
    
    // If clubId filter doesn't work, try without it
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
        if (i < judges.length) continue; // Skip if we already have this judge
        
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
    
    // Generate 20 dancers
    console.log('\n2. Generating 20 dancers...');
    const dancers = [];
    
    for (let i = 1; i <= 20; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      // Ensure unique names
      if (dancers.some(d => d.name === name)) {
        i--; // Retry this iteration
        continue;
      }
      
      const groupNumber = Math.ceil(i / 5); // Groups of 5
      const group = `Group ${groupNumber}`;
      
      const dancerData = {
        name,
        auditionNumber: i.toString().padStart(2, '0'),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        shirtSize: shirtSizes[Math.floor(Math.random() * shirtSizes.length)],
        group: group,
        year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][Math.floor(Math.random() * 4)],
        major: majors[Math.floor(Math.random() * majors.length)],
        previousMember: Math.random() > 0.7,
        previousLevel: Math.random() > 0.7 ? dancerGroups[Math.floor(Math.random() * dancerGroups.length)] : '',
        auditionId: auditionId,
        clubId: clubId,
        createdAt: new Date()
      };
      
      const dancerRef = await db.collection('dancers').add(dancerData);
      dancers.push({
        id: dancerRef.id,
        ...dancerData
      });
      
      console.log(`   ✅ Created dancer ${i}: ${name} (#${dancerData.auditionNumber}) - ${group}`);
    }
    
    // Generate 9 scores for each dancer (one from each judge)
    console.log('\n3. Generating scores (9 judges × 20 dancers = 180 scores)...');
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
          auditionId: auditionId,
          clubId: clubId,
          judgeId: judge.id,
          judgeName: judge.name || judge.email || judge.id,
          scores: scores,
          comments: `Test score from ${judge.name}`,
          submitted: true,
          timestamp: new Date()
        };
        
        await db.collection('scores').add(scoreData);
        totalScoresAdded++;
      }
      
      console.log(`      ✅ Added 9 scores for ${dancer.name}`);
    }
    
    // Update audition with dancer count
    await db.collection('auditions').doc(auditionId).update({
      dancers: dancers.length,
      updatedAt: new Date()
    });
    
    console.log('\n🎉 TEST AUDITION CREATION COMPLETE!');
    console.log('===================================');
    console.log(`✅ Created audition: "Test Audition - 20 Dancers"`);
    console.log(`✅ Audition ID: ${auditionId}`);
    console.log(`✅ Status: active`);
    console.log(`✅ Added ${dancers.length} dancers`);
    console.log(`✅ Added ${totalScoresAdded} scores (9 judges × ${dancers.length} dancers)`);
    console.log(`✅ All scores submitted`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Dancers: ${dancers.length}`);
    console.log(`   - Judges: ${judges.length}`);
    console.log(`   - Scores per dancer: 9`);
    console.log(`   - Total scores: ${totalScoresAdded}`);
    console.log(`   - Status: active`);
    console.log(`\n✨ The audition is now active and ready to use!`);
    
    // Return result for API endpoint
    return {
      auditionId: auditionId,
      auditionName: 'Test Audition - 20 Dancers',
      status: 'active',
      dancersCount: dancers.length,
      judgesCount: judges.length,
      scoresCount: totalScoresAdded,
      clubId: clubId
    };
    
  } catch (error) {
    console.error('❌ Error creating test audition:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createTestAuditionWith20Dancers()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = createTestAuditionWith20Dancers;
