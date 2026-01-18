const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
// Will find audition by name
let AUDITION_ID = null;

// Dancer data with exact scores
const dancersData = [
  // Level 1
  { name: 'Karina Abrahams', score: 30.91, level: 'Level 1', tryoutNumber: '56', email: 'Abrahamskarina@iCloud.com' },
  { name: 'Lauren Chorazyczewski', score: 30.79, level: 'Level 1', tryoutNumber: 'Eboard', email: 'chorazy5@msu.edu' },
  { name: 'Riley Jones', score: 30.36, level: 'Level 1', tryoutNumber: 'Eboard', email: 'jonesri8@msu.edu' },
  { name: 'Rhianna Ungerman', score: 29.71, level: 'Level 1', tryoutNumber: '5', email: 'Ungerma5@msu.edu' },
  { name: 'Sophia Goldapper', score: 29.67, level: 'Level 1', tryoutNumber: 'Eboard', email: 'goldapp1@msu.edu' },
  { name: 'Abi Collier', score: 29.67, level: 'Level 1', tryoutNumber: 'Eboard', email: 'colli954@msu.edu' },
  { name: 'Tatyana Chism', score: 29.57, level: 'Level 1', tryoutNumber: '26', email: 'chismtat@msu.edu' },
  { name: 'Julie Trent', score: 29.5, level: 'Level 1', tryoutNumber: '77', email: 'julietrent10@gmail.com' },
  { name: 'Katie Kama', score: 29.17, level: 'Level 1', tryoutNumber: '14', email: 'kamakate@msu.edu' },
  { name: 'Hallie Flechsig', score: 29, level: 'Level 1', tryoutNumber: 'Eboard', email: 'hallieflechsig23@gmail.com' },
  { name: 'Avery Humphrey', score: 28.92, level: 'Level 1', tryoutNumber: '80', email: 'humph231@msu.edu' },
  { name: 'Dottie Lloyd', score: 28.75, level: 'Level 1', tryoutNumber: '41', email: 'dottieelloyd@yahoo.com' },
  { name: 'gabi alfano', score: 28.46, level: 'Level 1', tryoutNumber: '76', email: 'gabrianna2024@gmail.com' },
  { name: 'Ava Domenicucci', score: 28.13, level: 'Level 1', tryoutNumber: '97', email: 'domenicucciava@yahoo.com' },
  { name: 'Mackenzie Martinsen', score: 27.67, level: 'Level 1', tryoutNumber: '86', email: 'zie.booth@gmail.com' },
  { name: 'Sierra Dynkowski', score: 27.67, level: 'Level 1', tryoutNumber: 'Eboard', email: 'dynkows3@msu.edu' },
  { name: 'Laney Seidel', score: 27, level: 'Level 1', tryoutNumber: '117', email: 'Laney.seidel@gmail.com' },
  { name: 'Paige Vogan', score: 26.75, level: 'Level 1', tryoutNumber: '16', email: 'Roovogan@gmail.com' },
  { name: 'Katelyn Richard', score: 26.75, level: 'Level 1', tryoutNumber: '34', email: 'rich1350@msu.edu' },
  { name: 'Grace Fitzpatrick', score: 26.58, level: 'Level 1', tryoutNumber: '141', email: 'fitzp241@msu.edu' },
  { name: 'Natalie Frazier', score: 25.93, level: 'Level 1', tryoutNumber: '2', email: 'frazi173@msu.edu' },
  { name: 'Nalani Broderick', score: 26.5, level: 'Level 1', tryoutNumber: '35', email: 'broder56@msu.edu' },
  { name: 'Addison Withrow', score: 26.42, level: 'Level 1', tryoutNumber: '12', email: 'withro14@msu.edu' },
  { name: 'Josselyn McGowan', score: 26.33, level: 'Level 1', tryoutNumber: '18', email: 'Mcgow124@msu.edu' },
  { name: 'Madalyn Gleason', score: 26.25, level: 'Level 1', tryoutNumber: '21', email: 'mhopeg14@gmail.com' },
  { name: 'Addison Donnelly', score: 25.92, level: 'Level 1', tryoutNumber: '75', email: 'Donne189@msu.edu' },
  
  // Level 2
  { name: 'Maya Given', score: 25.57, level: 'Level 2', tryoutNumber: '27', email: 'maya.given08@gmail.com' },
  { name: 'Stephania Sketch', score: 25.43, level: 'Level 2', tryoutNumber: '29', email: 'sketchst@msu.edu' },
  { name: 'Marisa Miller', score: 25.21, level: 'Level 2', tryoutNumber: '123', email: 'mill4156@msu.edu' },
  { name: 'Addison Bibik', score: 25.13, level: 'Level 2', tryoutNumber: '53', email: 'bibikadd@msu.edu' },
  { name: 'Cara Pellegrino', score: 25.08, level: 'Level 2', tryoutNumber: '66', email: 'Cara.pellegrino4@gmail.com' },
  { name: 'Morgan Meyerhofer', score: 25.08, level: 'Level 2', tryoutNumber: '129', email: 'meyerh14@msu.edu' },
  { name: 'Ashley Berriman', score: 25.04, level: 'Level 2', tryoutNumber: '20', email: 'berrima9@msu.edu' },
  { name: 'Devin Olep', score: 24.92, level: 'Level 2', tryoutNumber: 'Eboard', email: 'olepdevi@msu.edu' },
  { name: 'Madeline Rice', score: 24.75, level: 'Level 2', tryoutNumber: '19', email: 'ricemade@msu.edu' },
  { name: 'Ashley Childs', score: 24.67, level: 'Level 2', tryoutNumber: '74', email: 'ashleychilds8380@gmail.com' },
  { name: 'Ellary Flowerday', score: 24.5, level: 'Level 2', tryoutNumber: '9', email: 'flowerd6@msu.edu' },
  { name: 'Sophie MacLeod Roth', score: 24.42, level: 'Level 2', tryoutNumber: '50', email: 'smlr1009@gmail.com' },
  { name: 'Grace Mazzola', score: 24.64, level: 'Level 2', tryoutNumber: 'Eboard', email: 'Mazzolag@msu.edu' },
  { name: 'Riley Souza', score: 24.33, level: 'Level 2', tryoutNumber: '31', email: 'rileynsouza@gmail.com' },
  { name: 'Lizzie Stewart', score: 24.25, level: 'Level 2', tryoutNumber: '24', email: 'stewa958@msu.edu' },
  { name: 'Breanna Bouyer', score: 24.08, level: 'Level 2', tryoutNumber: '71', email: 'bouyerb1@msu.edu' },
  { name: 'Mya Moorhous', score: 23.93, level: 'Level 2', tryoutNumber: 'Eboard', email: 'moorhou8@msu.edu' },
  { name: 'Chandler Waters', score: 23.92, level: 'Level 2', tryoutNumber: '127', email: 'waters40@msu.edu' },
  { name: 'Keira Byrd', score: 23.83, level: 'Level 2', tryoutNumber: '39', email: 'byrdkeir@msu.edu' },
  { name: 'Chloe Hartman', score: 23.67, level: 'Level 2', tryoutNumber: '8', email: 'chloe.g.hartman@gmail.com' },
  { name: 'Ciara Dyer', score: 23.58, level: 'Level 2', tryoutNumber: '17', email: 'Dyerciar@msu.edu' },
  { name: 'Emma Olds', score: 23.29, level: 'Level 2', tryoutNumber: '30', email: 'oldsemm1@msu.edu' },
  { name: 'Tiffany Brezniak', score: 23.33, level: 'Level 2', tryoutNumber: '25', email: 'Brezniak@msu.edu' },
  { name: 'Hailey Hoffman', score: 23.25, level: 'Level 2', tryoutNumber: '112', email: 'haileychristine135@gmail.com' },
  { name: 'Madelyn Wilkins', score: 23, level: 'Level 2', tryoutNumber: '102', email: 'wilki395@msu.edu' },
  { name: 'Aaliana Lester', score: 22.92, level: 'Level 2', tryoutNumber: '89', email: 'lesteraa@msu.edu' },
  { name: 'Alayna Snow', score: 22.92, level: 'Level 2', tryoutNumber: '116', email: 'snowalay@msu.edu' },
  { name: 'Nadia Speitder', score: 22.92, level: 'Level 2', tryoutNumber: '136', email: 'nadia.spreitzer@gmail.com' },
  
  // Level 3
  { name: 'Sheradyn Ladner', score: 22.83, level: 'Level 3', tryoutNumber: '57', email: 'ladnersh@msu.edu' },
  { name: 'Marissa Benn', score: 22.75, level: 'Level 3', tryoutNumber: '111', email: 'Bennmari@msu.edu' },
  { name: 'Ryann Kragt', score: 22.67, level: 'Level 3', tryoutNumber: '48', email: 'kragtrya@msu.edu' },
  { name: 'Taylorrose Pascale', score: 22.58, level: 'Level 3', tryoutNumber: 'Eboard', email: 'pascalet@msu.edu' },
  { name: 'Chloe leazer', score: 22.5, level: 'Level 3', tryoutNumber: '68', email: 'Leazerch@msu.edu' },
  { name: 'Katelyn Allen', score: 22.5, level: 'Level 3', tryoutNumber: '87', email: 'Allenk33@msu.edu' },
  { name: 'Madison Frimpter', score: 22.42, level: 'Level 3', tryoutNumber: '59', email: 'frimpter@msu.edu' },
  { name: 'Kiana Ruvolo', score: 22.42, level: 'Level 3', tryoutNumber: '125', email: 'Ruvoloki@msu.edu' },
  { name: 'Kami kindred', score: 22.17, level: 'Level 3', tryoutNumber: '37', email: 'Kindredk@msu.com' },
  { name: 'Sydney Capen', score: 22, level: 'Level 3', tryoutNumber: '58', email: 'capensyd@msu.edu' },
  { name: 'Sophia Costanza', score: 22, level: 'Level 3', tryoutNumber: '101', email: 'costan42@msu.edu' },
  { name: 'Brooke Bass', score: 21.83, level: 'Level 3', tryoutNumber: '51', email: 'bassbroo@msu.edu' },
  { name: 'Chloe Alexander', score: 21.5, level: 'Level 3', tryoutNumber: '60', email: 'alexa643@msu.edu' },
  { name: 'Britney Brigham', score: 21.42, level: 'Level 3', tryoutNumber: '109', email: 'brighamb@msu.edu' },
  { name: 'Reagan Lewis', score: 20.92, level: 'Level 3', tryoutNumber: '84', email: 'lewisrea@msu.edu' },
  { name: 'Lucy moser', score: 20.92, level: 'Level 3', tryoutNumber: '114', email: 'Moserlu1@msu.edu.com' },
  { name: 'maddy rolston', score: 20.75, level: 'Level 3', tryoutNumber: '113', email: 'rolstonm@msu.edu' },
  { name: 'Anna Pinnick', score: 20.75, level: 'Level 3', tryoutNumber: '118', email: 'pinnicka@msu.edu' },
  { name: 'Jourdyn Carter', score: 20.58, level: 'Level 3', tryoutNumber: '119', email: 'Carte668@msu.edu' },
  { name: 'Victoria (Tori) Marsman', score: 20.33, level: 'Level 3', tryoutNumber: '10', email: 'marsmanv@msu.edu' },
  { name: 'Ilana olson', score: 20.33, level: 'Level 3', tryoutNumber: '49', email: 'ilanaolson@icloud.com' },
  { name: 'Grace Chapman', score: 20.25, level: 'Level 3', tryoutNumber: '46', email: 'chapm406@msu.edu' },
  { name: 'Payton Barry', score: 20.08, level: 'Level 3', tryoutNumber: '70', email: 'barrypay@msu.edu' },
  { name: 'Hailey Panackia', score: 19.92, level: 'Level 3', tryoutNumber: '62', email: 'Panacki1@msu.edu' },
  { name: 'Jade Miller', score: 19.92, level: 'Level 3', tryoutNumber: '110', email: 'Mill3535@msu.edu' },
  { name: 'Tamara Payne', score: 19.75, level: 'Level 3', tryoutNumber: '88', email: 'Payneta2@msu.edu' },
  { name: 'Melissa Graff', score: 19.42, level: 'Level 3', tryoutNumber: '104', email: 'graffmel@msu.edu' },
  { name: 'Marnie Jacobs', score: 19.25, level: 'Level 3', tryoutNumber: '93', email: 'jacob442@msu.edu' },
  { name: 'Kayla Stachowiak', score: 19.17, level: 'Level 3', tryoutNumber: '94', email: 'Stacho28@msu.edu' },
  { name: 'Chloe Avery', score: 19.17, level: 'Level 3', tryoutNumber: '139', email: 'chloe.avery2017@gmail.com' },
  { name: 'Izzy Cheng', score: 17, level: 'Level 3', tryoutNumber: 'Eboard', email: 'chengisa@msu.edu' },
  
  // Level 4
  { name: 'Alexis Guikema', score: 18.67, level: 'Level 4', tryoutNumber: '47', email: 'guikema2@msu.edu' },
  { name: 'Claire Ross', score: 18.58, level: 'Level 4', tryoutNumber: '81', email: 'cjross1072@gmail.com' },
  { name: 'Victoria Wegreynowicz', score: 17.71, level: 'Level 4', tryoutNumber: '4', email: 'wegrzyn5@msu.edu' },
  { name: 'Josie Caouette', score: 17.67, level: 'Level 4', tryoutNumber: '91', email: 'caouett1@msu.edu' },
  { name: 'Kaitlyn Reif', score: 17.58, level: 'Level 4', tryoutNumber: '82', email: 'reifkait@msu.edu' },
  { name: 'Rebecca Jankowski', score: 17.42, level: 'Level 4', tryoutNumber: '96', email: 'Janko106@msu.edu' },
  { name: 'Halie Joswick', score: 17.38, level: 'Level 4', tryoutNumber: '6', email: 'joswickh@msu.edu' },
  { name: 'Lauren Cermak', score: 16.54, level: 'Level 4', tryoutNumber: '85', email: 'cermakla@msu.edu' },
  { name: 'Annalee Davis', score: 16.25, level: 'Level 4', tryoutNumber: '78', email: 'Davis663@msu.edu' },
  { name: 'Natalie Hammer', score: 16.17, level: 'Level 4', tryoutNumber: '90', email: 'Hammern3@msu.edu' },
  { name: 'Meredith Weis', score: 15.83, level: 'Level 4', tryoutNumber: '38', email: 'weismere@msu.edu' },
  { name: 'Samantha Plunkett', score: 14.92, level: 'Level 4', tryoutNumber: '121', email: 'Plunke33@msu.edu' },
  { name: 'Sophia Kment', score: 14.75, level: 'Level 4', tryoutNumber: '83', email: 'kmentsop@msu.edu' },
  { name: 'Koryania robinson', score: 14.17, level: 'Level 4', tryoutNumber: '73', email: 'Robi1402@msu.edu' },
  { name: 'Lillian Weigand', score: 12.67, level: 'Level 4', tryoutNumber: '52', email: 'weigandl@msu.edu' },
  { name: 'Amelia Hachenski', score: 12.25, level: 'Level 4', tryoutNumber: '120', email: 'hachens5@msu.edu' },
  { name: 'Ava Mazilauskas', score: 12, level: 'Level 4', tryoutNumber: '105', email: 'mazilaus@msu.edu' },
  { name: 'Teanna Powell', score: 11.58, level: 'Level 4', tryoutNumber: '100', email: 'powel374@msu.edu' },
  { name: 'Abigail Uganski', score: 10.58, level: 'Level 4', tryoutNumber: '42', email: 'uganski2@msu.edu' },
  { name: 'Alyssa Hanselman', score: 10.33, level: 'Level 4', tryoutNumber: '23', email: 'hansel22@msu.edu' },
  { name: 'Madison Saegebrecht', score: 9.92, level: 'Level 4', tryoutNumber: '43', email: 'Saegebre@msu.edu' },
  { name: 'Joshua Kim', score: 9.17, level: 'Level 4', tryoutNumber: '13', email: 'kimjos23@msu.edu' },
  { name: 'Nadia LaBuda', score: 7.67, level: 'Level 4', tryoutNumber: '44', email: 'Labudana@msu.edu' },
];

async function updateScores() {
  try {
    console.log('🔍 Finding "Fall 2025" audition...\n');
    
    // Find audition by name
    const auditionsSnapshot = await db.collection('auditions')
      .where('name', '==', 'Fall 2025')
      .limit(1)
      .get();
    
    if (auditionsSnapshot.empty) {
      console.error('❌ Audition "Fall 2025" not found!');
      process.exit(1);
    }
    
    const auditionDoc = auditionsSnapshot.docs[0];
    AUDITION_ID = auditionDoc.id;
    const auditionData = auditionDoc.data();
    
    console.log(`✅ Found audition: "${auditionData.name}" (ID: ${AUDITION_ID})`);
    console.log(`   Club ID: ${auditionData.clubId || CLUB_ID}\n`);
    
    console.log('🔍 Finding dancers...\n');
    
    // Get all dancers for this audition
    const dancersSnapshot = await db.collection('dancers')
      .where('auditionId', '==', AUDITION_ID)
      .get();
    
    console.log(`Found ${dancersSnapshot.size} dancers\n`);
    
    let updated = 0;
    let notFound = 0;
    const errors = [];
    
    for (const dancerInfo of dancersData) {
      try {
        // Find dancer by name (case-insensitive)
        let dancerDoc = null;
        for (const doc of dancersSnapshot.docs) {
          if (doc.data().name?.toLowerCase() === dancerInfo.name.toLowerCase()) {
            dancerDoc = doc;
            break;
          }
        }
        
        if (!dancerDoc) {
          console.log(`   ⚠️  ${dancerInfo.name}: Dancer not found`);
          notFound++;
          continue;
        }
        
        const dancerId = dancerDoc.id;
        const totalScore = dancerInfo.score;
        
        // Distribute score proportionally:
        // kick, jump, turn, performance: 0-4 each (16 points total)
        // execution, technique: 0-8 each (16 points total)
        // Total max = 32
        // So: first 4 get 50% of score, last 2 get 50% of score
        
        const firstFourTotal = totalScore * 0.5; // 50% of score for kick/jump/turn/performance
        const lastTwoTotal = totalScore * 0.5; // 50% of score for execution/technique
        
        const kick = parseFloat((firstFourTotal / 4).toFixed(2));
        const jump = parseFloat((firstFourTotal / 4).toFixed(2));
        const turn = parseFloat((firstFourTotal / 4).toFixed(2));
        const performance = parseFloat((firstFourTotal / 4).toFixed(2));
        const execution = parseFloat((lastTwoTotal / 2).toFixed(2));
        const technique = parseFloat((lastTwoTotal / 2).toFixed(2));
        
        // Verify total (handle rounding)
        const calculatedTotal = kick + jump + turn + performance + execution + technique;
        const difference = totalScore - calculatedTotal;
        
        // Add difference to technique to ensure exact total
        const adjustedTechnique = parseFloat((technique + difference).toFixed(2));
        
        const scoresData = {
          kick: Math.max(0, Math.min(4, kick)),
          jump: Math.max(0, Math.min(4, jump)),
          turn: Math.max(0, Math.min(4, turn)),
          performance: Math.max(0, Math.min(4, performance)),
          execution: Math.max(0, Math.min(8, execution)),
          technique: Math.max(0, Math.min(8, adjustedTechnique))
        };
        
        // Find score document
        const scoresSnapshot = await db.collection('scores')
          .where('clubId', '==', CLUB_ID)
          .where('dancerId', '==', dancerId)
          .where('auditionId', '==', AUDITION_ID)
          .where('judgeName', '==', 'Imported Data')
          .limit(1)
          .get();
        
        if (scoresSnapshot.empty) {
          // Create new score if doesn't exist
          await db.collection('scores').add({
            clubId: CLUB_ID,
            dancerId: dancerId,
            auditionId: AUDITION_ID,
            judgeName: 'Imported Data',
            scores: scoresData,
            submitted: true,
            createdAt: new Date().toISOString()
          });
          console.log(`   ✨ Created score: ${dancerInfo.name} - Total: ${totalScore}`);
        } else {
          // Update existing score
          await scoresSnapshot.docs[0].ref.update({
            scores: scoresData,
            updatedAt: new Date().toISOString()
          });
          console.log(`   ✅ Updated score: ${dancerInfo.name} - Total: ${totalScore} (calculated: ${(scoresData.kick + scoresData.jump + scoresData.turn + scoresData.performance + scoresData.execution + scoresData.technique).toFixed(2)})`);
        }
        
        updated++;
      } catch (error) {
        errors.push({ dancer: dancerInfo.name, error: error.message });
        console.error(`   ❌ Error processing ${dancerInfo.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Not Found: ${notFound}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
      errors.forEach(e => console.log(`      - ${e.dancer}: ${e.error}`));
    }
    
    console.log(`\n✅ Score update complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

updateScores();
