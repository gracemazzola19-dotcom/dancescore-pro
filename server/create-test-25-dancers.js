const dbAdapter = require('./database-adapter');
const db = dbAdapter;

// Sample data for generating realistic dancers
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Benjamin',
  'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Mia', 'Alexander', 'Harper', 'Mason', 'Evelyn', 'Michael',
  'Abigail', 'Ethan', 'Emily', 'Daniel', 'Elizabeth', 'Jacob', 'Sofia', 'Logan', 'Avery', 'Jackson',
  'Ella', 'Levi', 'Madison', 'Sebastian', 'Scarlett', 'Mateo', 'Victoria', 'Jack', 'Aria', 'Owen',
  'Grace', 'Theodore', 'Chloe', 'Aiden', 'Camila', 'Samuel', 'Penelope', 'Joseph', 'Riley', 'John'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const majors = [
  'Computer Science', 'Business Administration', 'Psychology', 'Biology', 'Engineering', 'Communications',
  'Education', 'Nursing', 'Marketing', 'Finance', 'Art', 'Music', 'Theater', 'Dance', 'Sports Medicine',
  'Pre-Med', 'Pre-Law', 'International Studies', 'Environmental Science', 'Mathematics', 'Chemistry',
  'Physics', 'English', 'History', 'Political Science', 'Sociology', 'Anthropology', 'Philosophy'
];

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const dancerGroups = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Extra Dance'];

async function createTestAuditionWith25Dancers() {
  console.log('🎯 CREATING TEST AUDITION WITH 25 DANCERS');
  console.log('==========================================');
  
  try {
    // First, create a new audition
    console.log('1. Creating new audition...');
    const auditionData = {
      name: 'Test Audition - 25 Dancers',
      date: '2025-01-25',
      status: 'active',
      judges: ['judge1', 'judge2', 'judge3', 'judge4', 'judge5', 'judge6', 'judge7', 'judge8', 'judge9'],
      createdAt: new Date().toISOString(),
      createdBy: 'judge3',
      dancers: 0
    };
    
    const auditionRef = await db.collection('auditions').add(auditionData);
    const auditionId = auditionRef.id;
    console.log(`✅ Created audition: ${auditionId}`);
    
    // Get all 9 judges (excluding Hallie and Izzy)
    const judgesSnapshot = await db.collection('judges')
      .where('active', '==', true)
      .get();
    
    const excludedJudges = ['Hallie', 'Izzy'];
    const judges = judgesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(judge => !excludedJudges.includes(judge.name));
    
    console.log(`✅ Found ${judges.length} judges: ${judges.map(j => j.name).join(', ')}`);
    
    // Clear existing dancers and scores for clean test
    console.log('\n2. Clearing existing data...');
    const existingDancersSnapshot = await db.collection('dancers').get();
    const existingScoresSnapshot = await db.collection('scores').get();
    
    const batch = db.batch();
    existingDancersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    existingScoresSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`✅ Cleared ${existingDancersSnapshot.docs.length} dancers and ${existingScoresSnapshot.docs.length} scores`);
    
    // Generate 25 dancers
    console.log('\n3. Generating 25 dancers...');
    const dancers = [];
    
    for (let i = 1; i <= 25; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      // Ensure unique names
      if (dancers.some(d => d.name === name)) {
        i--; // Retry this iteration
        continue;
      }
      
      const dancer = {
        name,
        auditionNumber: i.toString().padStart(2, '0'),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        shirtSize: shirtSizes[Math.floor(Math.random() * shirtSizes.length)],
        dancerGroup: dancerGroups[Math.floor(Math.random() * dancerGroups.length)],
        year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][Math.floor(Math.random() * 4)],
        major: majors[Math.floor(Math.random() * majors.length)],
        previousMember: Math.random() > 0.7, // 30% chance of being previous member
        auditionId: auditionId,
        createdAt: new Date().toISOString(),
        scores: []
      };
      
      dancers.push(dancer);
    }
    
    // Add dancers to database
    const dancerRefs = [];
    for (const dancer of dancers) {
      const dancerRef = await db.collection('dancers').add(dancer);
      dancerRefs.push({ id: dancerRef.id, ...dancer });
      console.log(`   Added: ${dancer.name} (#${dancer.auditionNumber})`);
    }
    
    console.log(`✅ Added ${dancers.length} dancers to database`);
    
    // Generate scores from all 9 judges for each dancer
    console.log('\n4. Generating scores from all 9 judges...');
    
    let totalScoresAdded = 0;
    
    for (const dancerRef of dancerRefs) {
      console.log(`   Processing ${dancerRef.name} (#${dancerRef.auditionNumber})...`);
      
      for (const judge of judges) {
        // Generate random scores with proper ranges
        const scores = {
          kick: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          jump: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          turn: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          performance: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0
          execution: Math.round((Math.random() * 7 + 1) * 10) / 10, // 1.0-8.0
          technique: Math.round((Math.random() * 7 + 1) * 10) / 10  // 1.0-8.0
        };
        
        // Calculate total score
        let totalScore = scores.kick + scores.jump + scores.turn + scores.performance + scores.execution + scores.technique;
        
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
          dancerId: dancerRef.id,
          auditionId: auditionId,
          judgeId: judge.id,
          judgeName: judge.name || judge.email || judge.id,
          scores: scores,
          total: Math.round(finalTotal * 10) / 10,
          comments: `Test score generated for ${dancerRef.name}`,
          submitted: true,
          timestamp: new Date()
        };
        
        // Add to database
        const scoreRef = await db.collection('scores').add(scoreData);
        totalScoresAdded++;
        
        console.log(`     ${judge.name}: ${finalTotal.toFixed(1)} (${scores.kick}+${scores.jump}+${scores.turn}+${scores.performance}+${scores.execution}+${scores.technique})`);
      }
    }
    
    // Update audition with dancer count
    await db.collection('auditions').doc(auditionId).update({
      dancers: dancers.length,
      updatedAt: new Date().toISOString()
    });
    
    console.log('\n🎉 TEST AUDITION CREATION COMPLETE!');
    console.log('===================================');
    console.log(`✅ Created audition: "Test Audition - 25 Dancers"`);
    console.log(`✅ Added ${dancers.length} dancers`);
    console.log(`✅ Added ${totalScoresAdded} scores`);
    console.log(`✅ ${judges.length} judges × ${dancers.length} dancers`);
    console.log(`✅ All scores in 9-31 range`);
    console.log(`✅ All score fields filled (kick, jump, turn, performance, execution, technique)`);
    console.log(`✅ Audition ID: ${auditionId}`);
    
    // Verify the data
    console.log('\n🔍 VERIFICATION:');
    const verifyDancersSnapshot = await db.collection('dancers').get();
    const verifyScoresSnapshot = await db.collection('scores').get();
    const verifyAuditionSnapshot = await db.collection('auditions').where('status', '==', 'active').get();
    
    console.log(`✅ Verification: ${verifyDancersSnapshot.size} dancers, ${verifyScoresSnapshot.size} scores, ${verifyAuditionSnapshot.size} active auditions`);
    
  } catch (error) {
    console.error('❌ Error creating test audition:', error);
    throw error;
  }
}

// Run the test audition creation
createTestAuditionWith25Dancers()
  .then(() => {
    console.log('\n🚀 Test audition creation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test audition creation failed:', error);
    process.exit(1);
  });


