const admin = require('firebase-admin');
const dbAdapter = require('./database-adapter');
const db = dbAdapter;

// Dancer data with levels and scores
const dancersData = [
  // Level 1
  { name: 'Karina Abrahams', score: 30.91, level: 'Level 1' },
  { name: 'Lauren', score: 30.79, level: 'Level 1' },
  { name: 'Riley Jones', score: 30.36, level: 'Level 1' },
  { name: 'Rhianna Ungerman', score: 29.71, level: 'Level 1' },
  { name: 'Sophia Goldapper', score: 29.67, level: 'Level 1' },
  { name: 'Abi', score: 29.67, level: 'Level 1' },
  { name: 'Tatyana Chism', score: 29.57, level: 'Level 1' },
  { name: 'Julie Trent', score: 29.5, level: 'Level 1' },
  { name: 'Katie Kama', score: 29.17, level: 'Level 1' },
  { name: 'Hallie', score: 29, level: 'Level 1' },
  { name: 'Avery Humphrey', score: 28.92, level: 'Level 1' },
  { name: 'Dottie Lloyd', score: 28.75, level: 'Level 1' },
  { name: 'gabi alfano', score: 28.46, level: 'Level 1' },
  { name: 'Ava Domenicucci', score: 28.13, level: 'Level 1' },
  { name: 'Mackenzie Martinsen', score: 27.67, level: 'Level 1' },
  { name: 'Sierra Dynkowski', score: 27.67, level: 'Level 1' },
  { name: 'Laney Seidel', score: 27, level: 'Level 1' },
  { name: 'Paige Vogan', score: 26.75, level: 'Level 1' },
  { name: 'Katelyn Richard', score: 26.75, level: 'Level 1' },
  { name: 'Grace Fitzpatrick', score: 26.58, level: 'Level 1' },
  { name: 'Natalie Frazier', score: 25.93, level: 'Level 1' },
  { name: 'Nalani Broderick', score: 26.5, level: 'Level 1' },
  { name: 'Addison Withrow', score: 26.42, level: 'Level 1' },
  { name: 'Josselyn McGowan', score: 26.33, level: 'Level 1' },
  { name: 'Madalyn Gleason', score: 26.25, level: 'Level 1' },
  { name: 'Addison Donnelly', score: 25.92, level: 'Level 1' },
  
  // Level 2
  { name: 'Maya Given', score: 25.57, level: 'Level 2' },
  { name: 'Stephania Sketch', score: 25.43, level: 'Level 2' },
  { name: 'Marisa Miller', score: 25.21, level: 'Level 2' },
  { name: 'Addison Bibik', score: 25.13, level: 'Level 2' },
  { name: 'Cara Pellegrino', score: 25.08, level: 'Level 2' },
  { name: 'Morgan Meyerhofer', score: 25.08, level: 'Level 2' },
  { name: 'Ashley Berriman', score: 25.04, level: 'Level 2' },
  { name: 'Devin Olep', score: 24.92, level: 'Level 2' },
  { name: 'Madeline Rice', score: 24.75, level: 'Level 2' },
  { name: 'Ashley Childs', score: 24.67, level: 'Level 2' },
  { name: 'Ellary Flowerday', score: 24.5, level: 'Level 2' },
  { name: 'Sophie MacLeod Roth', score: 24.42, level: 'Level 2' },
  { name: 'Grace Mazzola', score: 24.64, level: 'Level 2' },
  { name: 'Riley Souza', score: 24.33, level: 'Level 2' },
  { name: 'Lizzie Stewart', score: 24.25, level: 'Level 2' },
  { name: 'Breanna Bouyer', score: 24.08, level: 'Level 2' },
  { name: 'Mya Moorhous', score: 23.93, level: 'Level 2' },
  { name: 'Chandler Waters', score: 23.92, level: 'Level 2' },
  { name: 'Keira Byrd', score: 23.83, level: 'Level 2' },
  { name: 'Chloe Hartman', score: 23.67, level: 'Level 2' },
  { name: 'Ciara Dyer', score: 23.58, level: 'Level 2' },
  { name: 'Emma Olds', score: 23.29, level: 'Level 2' },
  { name: 'Tiffany Brezniak', score: 23.33, level: 'Level 2' },
  { name: 'Hailey Hoffman', score: 23.25, level: 'Level 2' },
  { name: 'Madelyn Wilkins', score: 23, level: 'Level 2' },
  { name: 'Aaliana Lester', score: 22.92, level: 'Level 2' },
  { name: 'Alayna Snow', score: 22.92, level: 'Level 2' },
  { name: 'Nadia Speitder', score: 22.92, level: 'Level 2' },
  
  // Level 3
  { name: 'Sheradyn Ladner', score: 22.83, level: 'Level 3' },
  { name: 'Marissa Benn', score: 22.75, level: 'Level 3' },
  { name: 'Ryann Kragt', score: 22.67, level: 'Level 3' },
  { name: 'Taylorrose Pascale', score: 22.58, level: 'Level 3' },
  { name: 'Chloe leazer', score: 22.5, level: 'Level 3' },
  { name: 'Katelyn Allen', score: 22.5, level: 'Level 3' },
  { name: 'Madison Frimpter', score: 22.42, level: 'Level 3' },
  { name: 'Kiana Ruvolo', score: 22.42, level: 'Level 3' },
  { name: 'Kami kindred', score: 22.17, level: 'Level 3' },
  { name: 'Sydney Capen', score: 22, level: 'Level 3' },
  { name: 'Sophia Costanza', score: 22, level: 'Level 3' },
  { name: 'Brooke Bass', score: 21.83, level: 'Level 3' },
  { name: 'Chloe Alexander', score: 21.5, level: 'Level 3' },
  { name: 'Britney Brigham', score: 21.42, level: 'Level 3' },
  { name: 'Reagan Lewis', score: 20.92, level: 'Level 3' },
  { name: 'Lucy moser', score: 20.92, level: 'Level 3' },
  { name: 'maddy rolston', score: 20.75, level: 'Level 3' },
  { name: 'Anna Pinnick', score: 20.75, level: 'Level 3' },
  { name: 'Jourdyn Carter', score: 20.58, level: 'Level 3' },
  { name: 'Victoria (Tori) Marsman', score: 20.33, level: 'Level 3' },
  { name: 'Ilana olson', score: 20.33, level: 'Level 3' },
  { name: 'Grace Chapman', score: 20.25, level: 'Level 3' },
  { name: 'Payton Barry', score: 20.08, level: 'Level 3' },
  { name: 'Hailey Panackia', score: 19.92, level: 'Level 3' },
  { name: 'Jade Miller', score: 19.92, level: 'Level 3' },
  { name: 'Tamara Payne', score: 19.75, level: 'Level 3' },
  { name: 'Melissa Graff', score: 19.42, level: 'Level 3' },
  { name: 'Marnie Jacobs', score: 19.25, level: 'Level 3' },
  { name: 'Kayla Stachowiak', score: 19.17, level: 'Level 3' },
  { name: 'Chloe Avery', score: 19.17, level: 'Level 3' },
  { name: 'Izzy Cheng', score: 17, level: 'Level 3' },
  
  // Level 4
  { name: 'Alexis Guikema', score: 18.67, level: 'Level 4' },
  { name: 'Claire Ross', score: 18.58, level: 'Level 4' },
  { name: 'Victoria Wegreynowicz', score: 17.71, level: 'Level 4' },
  { name: 'Josie Caouette', score: 17.67, level: 'Level 4' },
  { name: 'Kaitlyn Reif', score: 17.58, level: 'Level 4' },
  { name: 'Rebecca Jankowski', score: 17.42, level: 'Level 4' },
  { name: 'Halie Joswick', score: 17.38, level: 'Level 4' },
  { name: 'Lauren Cermak', score: 16.54, level: 'Level 4' },
  { name: 'Annalee Davis', score: 16.25, level: 'Level 4' },
  { name: 'Natalie Hammer', score: 16.17, level: 'Level 4' },
  { name: 'Meredith Weis', score: 15.83, level: 'Level 4' },
  { name: 'Samantha Plunkett', score: 14.92, level: 'Level 4' },
  { name: 'Sophia Kment', score: 14.75, level: 'Level 4' },
  { name: 'Koryania robinson', score: 14.17, level: 'Level 4' },
  { name: 'Lillian Weigand', score: 12.67, level: 'Level 4' },
  { name: 'Amelia Hachenski', score: 12.25, level: 'Level 4' },
  { name: 'Ava Mazilauskas', score: 12, level: 'Level 4' },
  { name: 'Teanna Powell', score: 11.58, level: 'Level 4' },
  { name: 'Abigail Uganski', score: 10.58, level: 'Level 4' },
  { name: 'Alyssa Hanselman', score: 10.33, level: 'Level 4' },
  { name: 'Madison Saegebrecht', score: 9.92, level: 'Level 4' },
  { name: 'Joshua Kim', score: 9.17, level: 'Level 4' },
  { name: 'Nadia LaBuda', score: 7.67, level: 'Level 4' },
];

const CLUB_ID = 'msu-dance-club';

async function updateDancers() {
  console.log('🔄 UPDATING DANCERS WITH SCORES AND LEVEL ASSIGNMENTS');
  console.log('======================================================\n');
  console.log(`Total dancers to update: ${dancersData.length}\n`);

  try {
    // Find the Fall 2025 audition
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', CLUB_ID)
      .where('name', '==', 'Fall 2025')
      .limit(1)
      .get();

    if (auditionsSnapshot.empty) {
      console.error('❌ Error: "Fall 2025" audition not found!');
      process.exit(1);
    }

    const auditionDoc = auditionsSnapshot.docs[0];
    const auditionId = auditionDoc.id;
    const auditionData = auditionDoc.data();

    console.log(`✅ Found audition: "Fall 2025" (ID: ${auditionId})`);
    console.log(`   Status: ${auditionData.status}\n`);

    // Get all existing dancers for this audition
    const existingDancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', CLUB_ID)
      .where('auditionId', '==', auditionId)
      .get();

    console.log(`   Found ${existingDancersSnapshot.size} existing dancers\n`);

    // Create a map of provided dancer data by name (case-insensitive)
    const providedDancersMap = new Map();
    dancersData.forEach(d => {
      providedDancersMap.set(d.name.toLowerCase().trim(), d);
    });

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound = [];

    // Update each existing dancer
    for (const dancerDoc of existingDancersSnapshot.docs) {
      const dancerData = dancerDoc.data();
      const dancerName = dancerData.name.toLowerCase().trim();
      const providedData = providedDancersMap.get(dancerName);

      if (!providedData) {
        notFound.push(dancerData.name);
        notFoundCount++;
        continue;
      }

      const { score, level } = providedData;

      // Distribute the overall score proportionally across categories
      const totalMaxScore = 4 * 4 + 8 * 2; // 32 total
      const scoreRatio = score / totalMaxScore;

      const distributedScores = {
        kick: parseFloat((scoreRatio * 4).toFixed(2)),
        jump: parseFloat((scoreRatio * 4).toFixed(2)),
        turn: parseFloat((scoreRatio * 4).toFixed(2)),
        performance: parseFloat((scoreRatio * 4).toFixed(2)),
        execution: parseFloat((scoreRatio * 8).toFixed(2)),
        technique: parseFloat((scoreRatio * 8).toFixed(2)),
      };

      // Ensure scores don't exceed max
      distributedScores.kick = Math.min(distributedScores.kick, 4);
      distributedScores.jump = Math.min(distributedScores.jump, 4);
      distributedScores.turn = Math.min(distributedScores.turn, 4);
      distributedScores.performance = Math.min(distributedScores.performance, 4);
      distributedScores.execution = Math.min(distributedScores.execution, 8);
      distributedScores.technique = Math.min(distributedScores.technique, 8);

      const totalScore = parseFloat(Object.values(distributedScores).reduce((sum, val) => sum + val, 0).toFixed(2));

      // Update dancer with level assignment and overall score
      await dancerDoc.ref.update({
        overallScore: score,
        assignedLevel: level,
        updatedAt: new Date()
      });

      // Find existing imported score or create new one
      const existingScoresSnapshot = await db.collection('scores')
        .where('clubId', '==', CLUB_ID)
        .where('dancerId', '==', dancerDoc.id)
        .where('auditionId', '==', auditionId)
        .where('judgeId', '==', 'imported-data')
        .limit(1)
        .get();

      if (!existingScoresSnapshot.empty) {
        // Update existing imported score
        const scoreDoc = existingScoresSnapshot.docs[0];
        await scoreDoc.ref.update({
          scores: {
            ...distributedScores,
            total: totalScore
          },
          comments: `Score updated with level assignment: ${level}`,
          timestamp: new Date()
        });
      } else {
        // Create new imported score
        const scoreData = {
          dancerId: dancerDoc.id,
          auditionId: auditionId,
          clubId: CLUB_ID,
          judgeId: 'imported-data',
          judgeName: 'Imported Data',
          scores: {
            ...distributedScores,
            total: totalScore
          },
          comments: `Score imported with level assignment: ${level}`,
          submitted: true,
          timestamp: new Date(),
          imported: true,
        };
        const scoreRef = await db.collection('scores').add(scoreData);

        // Update dancer's scores array
        const currentScores = dancerData.scores || [];
        await dancerDoc.ref.update({
          scores: [...currentScores, scoreRef.id]
        });
      }

      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`   ✅ Updated ${updatedCount} dancers...`);
      }
    }

    console.log('\n📊 UPDATE SUMMARY:');
    console.log(`   ✅ Successfully updated: ${updatedCount} dancers`);
    console.log(`   ⚠️  Not found in provided data: ${notFoundCount} dancers`);
    
    if (notFound.length > 0) {
      console.log('\n   Dancers not found in provided data:');
      notFound.forEach(name => console.log(`      - ${name}`));
    }

    // Count by level
    const levelCounts = {};
    dancersData.forEach(d => {
      levelCounts[d.level] = (levelCounts[d.level] || 0) + 1;
    });
    
    console.log('\n   Dancers by level:');
    Object.entries(levelCounts).forEach(([level, count]) => {
      console.log(`      ${level}: ${count} dancers`);
    });

    console.log('\n🎉 Update complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the update
updateDancers();
