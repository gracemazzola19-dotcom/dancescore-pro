const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';

async function fixClubMembersSeasonId() {
  console.log('🔧 FIXING CLUB MEMBERS SEASON ID');
  console.log('==================================\n');

  try {
    // Get all club members
    const membersSnapshot = await db.collection('club_members')
      .where('clubId', '==', CLUB_ID)
      .get();

    console.log(`Found ${membersSnapshot.size} club members to check\n`);

    if (membersSnapshot.size === 0) {
      console.log('✅ No club members found. Nothing to fix.');
      process.exit(0);
    }

    let updateCount = 0;
    let alreadyCorrect = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const auditionId = memberData.auditionId;
      const currentSeasonId = memberData.seasonId;

      // If seasonId is missing or doesn't match auditionId, fix it
      if (!currentSeasonId || currentSeasonId !== auditionId) {
        batch.update(memberDoc.ref, {
          seasonId: String(auditionId || ''),
          seasonStatus: memberData.seasonStatus || 'active'
        });
        updateCount++;
        batchCount++;

        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`   ✅ Updated batch: ${updateCount} members so far...`);
          batchCount = 0;
        }
      } else {
        alreadyCorrect++;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Updated: ${updateCount} members`);
    console.log(`   ✓ Already correct: ${alreadyCorrect} members`);
    console.log(`   📝 Total: ${membersSnapshot.size} members`);

    // Verify the fix
    console.log('\n🔍 Verification:');
    const membersBySeasonId = await db.collection('club_members')
      .where('clubId', '==', CLUB_ID)
      .where('seasonId', '==', 'gszB9aDbGXlzbDXibjAi') // Fall 2025 audition ID
      .get();
    
    console.log(`   Members with seasonId set: ${membersBySeasonId.size}`);

    console.log('\n🎉 Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix
fixClubMembersSeasonId();
