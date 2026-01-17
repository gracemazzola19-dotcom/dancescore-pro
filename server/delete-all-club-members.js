const dbAdapter = require('./database-adapter');
const db = dbAdapter;

const CLUB_ID = 'msu-dance-club';

async function deleteAllClubMembers() {
  console.log('🗑️  DELETING ALL CLUB MEMBERS');
  console.log('================================\n');

  try {
    // Get all club members for this club
    const membersSnapshot = await db.collection('club_members')
      .where('clubId', '==', CLUB_ID)
      .get();

    console.log(`Found ${membersSnapshot.size} club members to delete\n`);

    if (membersSnapshot.size === 0) {
      console.log('✅ No club members found. Nothing to delete.');
      process.exit(0);
    }

    // Confirm deletion
    console.log(`⚠️  WARNING: This will permanently delete ${membersSnapshot.size} club member(s)!`);
    console.log('   This action cannot be undone.\n');

    // Delete in batches (Firestore batch limit is 500)
    let deletedCount = 0;
    for (let i = 0; i < membersSnapshot.docs.length; i += 500) {
      const batch = db.batch();
      const batchDocs = membersSnapshot.docs.slice(i, i + 500);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`   ✅ Deleted batch ${Math.floor(i / 500) + 1}: ${batchDocs.length} members (${deletedCount}/${membersSnapshot.size})`);
    }

    console.log(`\n🎉 Successfully deleted ${deletedCount} club member(s)!`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteAllClubMembers();
