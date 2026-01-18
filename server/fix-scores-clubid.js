const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
const AUDITION_ID = 'j4PT4IQ2VIQ0jofudIGL';

async function fixScoresClubId() {
  try {
    console.log('🔍 Fixing clubId for scores...\n');
    
    // Find all scores for this audition
    const scoresSnapshot = await db.collection('scores')
      .where('auditionId', '==', AUDITION_ID)
      .where('judgeName', '==', 'Imported Data')
      .get();
    
    console.log(`Found ${scoresSnapshot.size} scores\n`);
    
    let updated = 0;
    let skipped = 0;
    const errors = [];
    
    for (const scoreDoc of scoresSnapshot.docs) {
      try {
        const scoreData = scoreDoc.data();
        
        // Check if clubId is missing or incorrect
        if (!scoreData.clubId || scoreData.clubId !== CLUB_ID) {
          // Update the score with clubId
          await scoreDoc.ref.update({
            clubId: CLUB_ID,
            updatedAt: new Date().toISOString()
          });
          updated++;
          
          // Get dancer name for logging
          const dancerDoc = await db.collection('dancers').doc(scoreData.dancerId).get();
          const dancerName = dancerDoc.exists ? dancerDoc.data().name : 'Unknown';
          
          console.log(`   ✅ Updated: ${dancerName} - Score ID: ${scoreDoc.id}`);
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({ scoreId: scoreDoc.id, error: error.message });
        console.error(`   ❌ Error processing score ${scoreDoc.id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped (already correct): ${skipped}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
      errors.forEach(e => console.log(`      - ${e.scoreId}: ${e.error}`));
    }
    
    console.log(`\n✅ Score fix complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixScoresClubId();
