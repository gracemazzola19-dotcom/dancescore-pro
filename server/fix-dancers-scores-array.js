const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
const AUDITION_ID = 'j4PT4IQ2VIQ0jofudIGL';

async function fixDancersScoresArray() {
  try {
    console.log('🔍 Fixing dancers scores array...\n');
    
    // Get all dancers for this audition
    const dancersSnapshot = await db.collection('dancers')
      .where('auditionId', '==', AUDITION_ID)
      .get();
    
    console.log(`Found ${dancersSnapshot.size} dancers\n`);
    
    let updated = 0;
    let skipped = 0;
    const errors = [];
    
    for (const dancerDoc of dancersSnapshot.docs) {
      try {
        const dancerId = dancerDoc.id;
        const dancerData = dancerDoc.data();
        
        // Get all scores for this dancer
        const scoresSnapshot = await db.collection('scores')
          .where('dancerId', '==', dancerId)
          .where('auditionId', '==', AUDITION_ID)
          .where('submitted', '==', true)
          .get();
        
        if (scoresSnapshot.size === 0) {
          console.log(`   ⚠️  ${dancerData.name}: No scores found`);
          skipped++;
          continue;
        }
        
        // Create scores array from score document IDs
        const scoreIds = scoresSnapshot.docs.map(doc => doc.id);
        
        // Update dancer with scores array
        await dancerDoc.ref.update({
          scores: scoreIds,
          updatedAt: new Date().toISOString()
        });
        
        updated++;
        console.log(`   ✅ Updated: ${dancerData.name} - Added ${scoreIds.length} score ID(s) to scores array`);
      } catch (error) {
        errors.push({ dancer: dancerData.name, error: error.message });
        console.error(`   ❌ Error processing ${dancerData.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
      errors.forEach(e => console.log(`      - ${e.dancer}: ${e.error}`));
    }
    
    console.log(`\n✅ Scores array fix complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixDancersScoresArray();
