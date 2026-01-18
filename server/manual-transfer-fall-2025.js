const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
const AUDITION_ID = 'j4PT4IQ2VIQ0jofudIGL';

async function transferDancers() {
  try {
    console.log('🔄 Manual transfer of dancers to club_members...\n');
    
    // Get audition data
    const auditionDoc = await db.collection('auditions').doc(AUDITION_ID).get();
    if (!auditionDoc.exists) {
      console.error('❌ Audition not found!');
      process.exit(1);
    }
    const auditionData = auditionDoc.data();
    
    // Get all dancers
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', CLUB_ID)
      .where('auditionId', '==', AUDITION_ID)
      .get();
    
    console.log(`Found ${dancersSnapshot.size} dancers\n`);
    
    const dancers = [];
    
    // Process dancers and calculate scores
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      const dancerId = doc.id;
      
      // Get scores
      const scoresSnapshot = await db.collection('scores')
        .where('clubId', '==', CLUB_ID)
        .where('dancerId', '==', dancerId)
        .where('auditionId', '==', AUDITION_ID)
        .where('submitted', '==', true)
        .get();
      
      // Calculate average and build scores object
      const scoresByJudge = {};
      let totalScoreSum = 0;
      let judgeCount = 0;
      
      for (const scoreDoc of scoresSnapshot.docs) {
        const scoreData = scoreDoc.data();
        const scoreValues = scoreData.scores || scoreData;
        const kick = scoreValues.kick || 0;
        const jump = scoreValues.jump || 0;
        const turn = scoreValues.turn || 0;
        const performance = scoreValues.performance || 0;
        const execution = scoreValues.execution || 0;
        const technique = scoreValues.technique || 0;
        const total = kick + jump + turn + performance + execution + technique;
        
        const judgeName = scoreData.judgeName || 'Unknown';
        scoresByJudge[judgeName] = {
          kick, jump, turn, performance, execution, technique,
          total,
          comments: scoreData.comments || ''
        };
        
        totalScoreSum += total;
        judgeCount++;
      }
      
      const averageScore = judgeCount > 0 ? totalScoreSum / judgeCount : 0;
      
      dancers.push({
        id: dancerId,
        name: dancerData.name,
        auditionNumber: dancerData.auditionNumber,
        email: dancerData.email || '',
        phone: dancerData.phone || '',
        shirtSize: dancerData.shirtSize || '',
        group: dancerData.group || 'Unassigned',
        averageScore: parseFloat(averageScore.toFixed(2)),
        scores: scoresByJudge,
        assignedLevel: dancerData.assignedLevel || 'Level 4'
      });
    }
    
    // Sort by score for ranking
    dancers.sort((a, b) => b.averageScore - a.averageScore);
    dancers.forEach((dancer, index) => {
      dancer.rank = index + 1;
    });
    
    console.log('Transferring dancers to club_members...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dancer of dancers) {
      try {
        const assignedLevel = dancer.assignedLevel || 'Level 4';
        const clubMemberData = {
          id: String(dancer.id),
          name: String(dancer.name || ''),
          email: String(dancer.email || ''),
          phone: String(dancer.phone || ''),
          shirtSize: String(dancer.shirtSize || ''),
          auditionNumber: String(dancer.auditionNumber || ''),
          dancerGroup: String(dancer.group || ''),
          averageScore: Number(dancer.averageScore.toFixed(2)),
          rank: Number(dancer.rank) || 0,
          previousMember: String(''),
          previousLevel: String(''),
          level: String(assignedLevel),
          assignedLevel: String(assignedLevel),
          clubId: CLUB_ID,
          auditionId: String(AUDITION_ID),
          seasonId: String(AUDITION_ID),
          seasonStatus: 'active',
          auditionName: String(auditionData.name || ''),
          auditionDate: String(auditionData.date || ''),
          transferredAt: new Date().toISOString(),
          transferredBy: 'admin',
          deliberationPhase: 1,
          overallScore: Number(dancer.averageScore.toFixed(2)),
          scores: dancer.scores || {}
        };
        
        const memberRef = await db.collection('club_members').add(clubMemberData);
        successCount++;
        
        if (successCount % 20 === 0) {
          console.log(`   ✅ Transferred ${successCount}/${dancers.length}...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error transferring ${dancer.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Transfer Summary:`);
    console.log(`   ✅ Successfully transferred: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Update deliberations record
    await db.collection('deliberations').doc(AUDITION_ID).set({
      auditionId: AUDITION_ID,
      clubId: CLUB_ID,
      dancersTransferred: successCount,
      submitted: true,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`\n✅ Transfer complete! ${successCount} dancers are now in club_members.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

transferDancers();
