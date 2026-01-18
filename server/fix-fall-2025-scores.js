const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
const AUDITION_ID = 'kAKFqtLY42gVrbHLrFkq';

async function fixScores() {
  try {
    console.log('🔍 Checking dancers and scores...\n');
    
    // Get all dancers for this audition
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', CLUB_ID)
      .where('auditionId', '==', AUDITION_ID)
      .get();
    
    console.log(`Found ${dancersSnapshot.size} dancers\n`);
    
    let fixed = 0;
    let skipped = 0;
    const errors = [];
    
    for (const dancerDoc of dancersSnapshot.docs) {
      try {
        const dancerId = dancerDoc.id;
        const dancerData = dancerDoc.data();
        
        // Get scores for this dancer
        const scoresSnapshot = await db.collection('scores')
          .where('clubId', '==', CLUB_ID)
          .where('dancerId', '==', dancerId)
          .where('auditionId', '==', AUDITION_ID)
          .where('submitted', '==', true)
          .get();
        
        if (scoresSnapshot.empty) {
          console.log(`   ⚠️  ${dancerData.name}: No submitted scores found`);
          skipped++;
          continue;
        }
        
        // Calculate average and build scores object
        let totalScoreSum = 0;
        let judgeCount = 0;
        const scoresByJudge = {};
        
        for (const scoreDoc of scoresSnapshot.docs) {
          const scoreData = scoreDoc.data();
          const scoreValues = scoreData.scores || scoreData;
          
          // Calculate total
          const kick = parseFloat(scoreValues.kick || 0);
          const jump = parseFloat(scoreValues.jump || 0);
          const turn = parseFloat(scoreValues.turn || 0);
          const performance = parseFloat(scoreValues.performance || 0);
          const execution = parseFloat(scoreValues.execution || 0);
          const technique = parseFloat(scoreValues.technique || 0);
          const total = kick + jump + turn + performance + execution + technique;
          
          const judgeName = scoreData.judgeName || scoreData.judgeId || 'Unknown';
          
          scoresByJudge[judgeName] = {
            kick: kick,
            jump: jump,
            turn: turn,
            performance: performance,
            execution: execution,
            technique: technique,
            total: total,
            comments: scoreData.comments || ''
          };
          
          totalScoreSum += total;
          judgeCount++;
        }
        
        const averageScore = judgeCount > 0 ? totalScoreSum / judgeCount : 0;
        
        // Find corresponding club_member
        const membersSnapshot = await db.collection('club_members')
          .where('clubId', '==', CLUB_ID)
          .where('auditionId', '==', AUDITION_ID)
          .where('id', '==', dancerId)
          .get();
        
        if (membersSnapshot.empty) {
          console.log(`   ⚠️  ${dancerData.name}: No club_member found (deliberations not submitted?)`);
          skipped++;
          continue;
        }
        
        // Update club_member with scores
        for (const memberDoc of membersSnapshot.docs) {
          await memberDoc.ref.update({
            scores: scoresByJudge,
            averageScore: parseFloat(averageScore.toFixed(2)),
            overallScore: parseFloat(averageScore.toFixed(2)),
            updatedAt: new Date().toISOString()
          });
          
          fixed++;
          console.log(`   ✅ ${dancerData.name}: Updated with ${judgeCount} score(s), avg: ${averageScore.toFixed(2)}`);
        }
      } catch (error) {
        errors.push({ dancer: dancerData.name, error: error.message });
        console.error(`   ❌ Error processing ${dancerData.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.length}`);
      errors.forEach(e => console.log(`      - ${e.dancer}: ${e.error}`));
    }
    
    console.log(`\n✅ Score fix complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixScores();
