const dbAdapter = require('./database-adapter');
const db = dbAdapter;

// Fall 2025 Auditions dancer data with scores
const dancersData = [
  { name: "Karina Abrahams", score: 30.91 },
  { name: "Lauren", score: 30.79 },
  { name: "Riley Jones", score: 30.36 },
  { name: "Rhianna Ungerman", score: 29.71 },
  { name: "Sophia Goldapper", score: 29.67 },
  { name: "Abi", score: 29.67 },
  { name: "Tatyana Chism", score: 29.57 },
  { name: "Julie Trent", score: 29.5 },
  { name: "Katie Kama", score: 29.17 },
  { name: "Hallie", score: 29 },
  { name: "Avery Humphrey", score: 28.92 },
  { name: "Dottie Lloyd", score: 28.75 },
  { name: "gabi alfano", score: 28.46 },
  { name: "Ava Domenicucci", score: 28.13 },
  { name: "Mackenzie Martinsen", score: 27.67 },
  { name: "Sierra Dynkowski", score: 27.67 },
  { name: "Laney Seidel", score: 27 },
  { name: "Paige Vogan", score: 26.75 },
  { name: "Katelyn Richard", score: 26.75 },
  { name: "Grace Fitzpatrick", score: 26.58 },
  { name: "Natalie Frazier", score: 25.93 },
  { name: "Nalani Broderick", score: 26.5 },
  { name: "Addison Withrow", score: 26.42 },
  { name: "Josselyn McGowan", score: 26.33 },
  { name: "Madalyn Gleason", score: 26.25 },
  { name: "Addison Donnelly", score: 25.92 },
  { name: "Maya Given", score: 25.57 },
  { name: "Stephania Sketch", score: 25.43 },
  { name: "Marisa Miller", score: 25.21 },
  { name: "Addison Bibik", score: 25.13 },
  { name: "Cara Pellegrino", score: 25.08 },
  { name: "Morgan Meyerhofer", score: 25.08 },
  { name: "Ashley Berriman", score: 25.04 },
  { name: "Devin Olep", score: 24.92 },
  { name: "Madeline Rice", score: 24.75 },
  { name: "Ashley Childs", score: 24.67 },
  { name: "Ellary Flowerday", score: 24.5 },
  { name: "Sophie MacLeod Roth", score: 24.42 },
  { name: "Grace Mazzola", score: 24.64 },
  { name: "Riley Souza", score: 24.33 },
  { name: "Lizzie Stewart", score: 24.25 },
  { name: "Breanna Bouyer", score: 24.08 },
  { name: "Mya Moorhous", score: 23.93 },
  { name: "Chandler Waters", score: 23.92 },
  { name: "Keira Byrd", score: 23.83 },
  { name: "Chloe Hartman", score: 23.67 },
  { name: "Ciara Dyer", score: 23.58 },
  { name: "Emma Olds", score: 23.29 },
  { name: "Tiffany Brezniak", score: 23.33 },
  { name: "Hailey Hoffman", score: 23.25 },
  { name: "Madelyn Wilkins", score: 23 },
  { name: "Aaliana Lester", score: 22.92 },
  { name: "Alayna Snow", score: 22.92 },
  { name: "Nadia Speitder", score: 22.92 },
  { name: "Sheradyn Ladner", score: 22.83 },
  { name: "Marissa Benn", score: 22.75 },
  { name: "Ryann Kragt", score: 22.67 },
  { name: "Taylorrose Pascale", score: 22.58 },
  { name: "Chloe leazer", score: 22.5 },
  { name: "Katelyn Allen", score: 22.5 },
  { name: "Madison Frimpter", score: 22.42 },
  { name: "Kiana Ruvolo", score: 22.42 },
  { name: "Kami kindred", score: 22.17 },
  { name: "Sydney Capen", score: 22 },
  { name: "Sophia Costanza", score: 22 },
  { name: "Brooke Bass", score: 21.83 },
  { name: "Chloe Alexander", score: 21.5 },
  { name: "Britney Brigham", score: 21.42 },
  { name: "Reagan Lewis", score: 20.92 },
  { name: "Lucy moser", score: 20.92 },
  { name: "maddy rolston", score: 20.75 },
  { name: "Anna Pinnick", score: 20.75 },
  { name: "Jourdyn Carter", score: 20.58 },
  { name: "Victoria (Tori) Marsman", score: 20.33 },
  { name: "Ilana olson", score: 20.33 },
  { name: "Grace Chapman", score: 20.25 },
  { name: "Payton Barry", score: 20.08 },
  { name: "Hailey Panackia", score: 19.92 },
  { name: "Jade Miller", score: 19.92 },
  { name: "Tamara Payne", score: 19.75 },
  { name: "Melissa Graff", score: 19.42 },
  { name: "Marnie Jacobs", score: 19.25 },
  { name: "Kayla Stachowiak", score: 19.17 },
  { name: "Chloe Avery", score: 19.17 },
  { name: "Izzy Cheng", score: 17 },
  { name: "Alexis Guikema", score: 18.67 },
  { name: "Claire Ross", score: 18.58 },
  { name: "Victoria Wegreynowicz", score: 17.71 },
  { name: "Josie Caouette", score: 17.67 },
  { name: "Kaitlyn Reif", score: 17.58 },
  { name: "Rebecca Jankowski", score: 17.42 },
  { name: "Halie Joswick", score: 17.38 },
  { name: "Lauren Cermak", score: 16.54 },
  { name: "Annalee Davis", score: 16.25 },
  { name: "Natalie Hammer", score: 16.17 },
  { name: "Meredith Weis", score: 15.83 },
  { name: "Samantha Plunkett", score: 14.92 },
  { name: "Sophia Kment", score: 14.75 },
  { name: "Koryania robinson", score: 14.17 },
  { name: "Lillian Weigand", score: 12.67 },
  { name: "Amelia Hachenski", score: 12.25 },
  { name: "Ava Mazilauskas", score: 12 },
  { name: "Teanna Powell", score: 11.58 },
  { name: "Abigail Uganski", score: 10.58 },
  { name: "Alyssa Hanselman", score: 10.33 },
  { name: "Madison Saegebrecht", score: 9.92 },
  { name: "Joshua Kim", score: 9.17 },
  { name: "Nadia LaBuda", score: 7.67 }
];

const CLUB_ID = 'msu-dance-club';
const AUDITION_NAME = 'Fall 2025 Auditions';

async function importDancers() {
  console.log('🚀 IMPORTING FALL 2025 DANCERS');
  console.log('================================\n');

  try {
    // Find the audition
    console.log(`1. Finding audition "${AUDITION_NAME}"...`);
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', CLUB_ID)
      .where('name', '==', AUDITION_NAME)
      .limit(1)
      .get();

    if (auditionsSnapshot.empty) {
      console.error(`❌ Audition "${AUDITION_NAME}" not found!`);
      console.error('   Please create the audition first or check the exact name.');
      process.exit(1);
    }

    const auditionDoc = auditionsSnapshot.docs[0];
    const auditionId = auditionDoc.id;
    const auditionData = auditionDoc.data();
    
    console.log(`✅ Found audition: "${AUDITION_NAME}" (ID: ${auditionId})`);
    console.log(`   Status: ${auditionData.status || 'draft'}`);
    console.log(`   Date: ${auditionData.date || 'N/A'}\n`);

    // Get existing dancers to avoid duplicates
    console.log('2. Checking for existing dancers...');
    const existingDancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', CLUB_ID)
      .where('auditionId', '==', auditionId)
      .get();

    const existingDancerNames = new Set(
      existingDancersSnapshot.docs.map(doc => doc.data().name.toLowerCase().trim())
    );

    // Get the highest audition number
    let maxAuditionNumber = 0;
    for (const doc of existingDancersSnapshot.docs) {
      const num = parseInt(doc.data().auditionNumber) || 0;
      if (num > maxAuditionNumber) {
        maxAuditionNumber = num;
      }
    }

    console.log(`   Found ${existingDancersSnapshot.size} existing dancers`);
    console.log(`   Starting audition numbers from: ${maxAuditionNumber + 1}\n`);

    // Process dancers
    console.log(`3. Importing ${dancersData.length} dancers...\n`);
    const results = {
      success: [],
      errors: [],
      skipped: []
    };

    for (let i = 0; i < dancersData.length; i++) {
      const dancerData = dancersData[i];
      const dancerName = dancerData.name.trim();
      const score = dancerData.score;

      // Check for duplicates
      if (existingDancerNames.has(dancerName.toLowerCase())) {
        results.skipped.push({ name: dancerName, reason: 'Already exists' });
        console.log(`   ⏭️  Skipped: ${dancerName} (already exists)`);
        continue;
      }

      try {
        // Generate audition number
        maxAuditionNumber++;
        const auditionNumber = maxAuditionNumber.toString().padStart(3, '0');

        // Create dancer record
        const newDancerData = {
          name: dancerName,
          auditionNumber: auditionNumber,
          email: '',
          phone: '',
          shirtSize: '',
          previousMember: 'no',
          previousLevel: null,
          clubId: CLUB_ID,
          auditionId: auditionId,
          group: `Group ${Math.ceil((i + 1) / 10)}`,
          createdAt: new Date(),
          scores: []
        };

        const dancerRef = await db.collection('dancers').add(newDancerData);
        const dancerId = dancerRef.id;

        // Distribute score across categories proportionally
        // Total is 32 points: kick(4) + jump(4) + turn(4) + performance(4) + execution(8) + technique(8)
        const totalPossible = 32;
        const scoreRatio = score / totalPossible;

        const kick = Math.round(4 * scoreRatio * 10) / 10;
        const jump = Math.round(4 * scoreRatio * 10) / 10;
        const turn = Math.round(4 * scoreRatio * 10) / 10;
        const performance = Math.round(4 * scoreRatio * 10) / 10;
        const execution = Math.round(8 * scoreRatio * 10) / 10;
        const technique = Math.round(8 * scoreRatio * 10) / 10;

        // Adjust to ensure total matches exactly
        const calculatedTotal = kick + jump + turn + performance + execution + technique;
        const difference = score - calculatedTotal;
        const adjustedTechnique = technique + difference;

        const scoreData = {
          dancerId: dancerId,
          auditionId: auditionId,
          clubId: CLUB_ID,
          judgeId: 'imported',
          judgeName: 'Imported Data',
          judgeEmail: 'import@dancescore.pro',
          scores: {
            kick: Math.max(0, Math.min(4, kick)),
            jump: Math.max(0, Math.min(4, jump)),
            turn: Math.max(0, Math.min(4, turn)),
            performance: Math.max(0, Math.min(4, performance)),
            execution: Math.max(0, Math.min(8, execution)),
            technique: Math.max(0, Math.min(8, adjustedTechnique))
          },
          total: score,
          submitted: true,
          submittedAt: new Date().toISOString(),
          imported: true,
          importedAt: new Date().toISOString(),
          importedBy: 'admin'
        };

        const scoreRef = await db.collection('scores').add(scoreData);

        // Update dancer's scores array
        await dancerRef.update({
          scores: [scoreRef.id],
          averageScore: score,
          overallScore: score
        });

        existingDancerNames.add(dancerName.toLowerCase());

        results.success.push({
          name: dancerName,
          auditionNumber: auditionNumber,
          score: score
        });

        console.log(`   ✅ ${dancerName} (#${auditionNumber}) - Score: ${score.toFixed(2)}`);
      } catch (error) {
        console.error(`   ❌ Error importing ${dancerName}:`, error.message);
        results.errors.push({ name: dancerName, error: error.message });
      }
    }

    // Summary
    console.log('\n📊 IMPORT SUMMARY');
    console.log('==================');
    console.log(`✅ Successfully imported: ${results.success.length}`);
    console.log(`⏭️  Skipped (duplicates): ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => {
        console.log(`   - ${err.name}: ${err.error}`);
      });
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped:');
      results.skipped.forEach(skip => {
        console.log(`   - ${skip.name}: ${skip.reason}`);
      });
    }

    console.log('\n🎉 Import complete!');
    console.log(`\nYou can now view these dancers in the "${AUDITION_NAME}" audition.`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the import
importDancers();
