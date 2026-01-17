const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';
const AUDITION_NAME = 'Fall 2025 Auditions';

async function fixClubMembersSeasons() {
  console.log('🔧 FIXING CLUB MEMBERS SEASON FIELDS');
  console.log('====================================\n');

  try {
    // Find the audition
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', CLUB_ID)
      .where('name', '==', AUDITION_NAME)
      .limit(1)
      .get();

    if (auditionsSnapshot.empty) {
      console.error(`❌ Audition "${AUDITION_NAME}" not found!`);
      process.exit(1);
    }

    const auditionDoc = auditionsSnapshot.docs[0];
    const auditionId = auditionDoc.id;
    const auditionData = auditionDoc.data();
    
    console.log(`✅ Found audition: "${AUDITION_NAME}" (ID: ${auditionId})`);
    console.log(`   Season Status: ${auditionData.seasonStatus || 'active'}\n`);

    // Get all club members for this audition
    const membersSnapshot = await db.collection('club_members')
      .where('clubId', '==', CLUB_ID)
      .where('auditionId', '==', auditionId)
      .get();

    console.log(`Found ${membersSnapshot.size} club members to update\n`);

    const batch = db.batch();
    let updateCount = 0;
    const seasonStatus = auditionData.seasonStatus || 'active';

    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      
      // Only update if seasonId or seasonStatus is missing
      if (!memberData.seasonId || !memberData.seasonStatus) {
        batch.update(memberDoc.ref, {
          seasonId: String(auditionId),
          seasonStatus: String(seasonStatus)
        });
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${updateCount} club members with seasonId and seasonStatus`);
    } else {
      console.log(`✅ All club members already have season fields`);
    }

    console.log('\n🎉 Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the fix
fixClubMembersSeasons();
