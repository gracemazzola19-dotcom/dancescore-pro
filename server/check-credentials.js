const dbAdapter = require('./database-adapter');
const db = dbAdapter;

async function checkAdminCredentials() {
  console.log('🔍 CHECKING ADMIN CREDENTIALS');
  console.log('==============================');
  
  try {
    // Check if we have any admin users
    const adminsSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    console.log(`✅ Found ${adminsSnapshot.size} admin users`);
    
    if (adminsSnapshot.size === 0) {
      console.log('❌ No admin users found!');
      console.log('🔧 Creating default admin user...');
      
      // Create default admin user
      const adminData = {
        email: 'admin@example.com',
        password: 'admin123', // This should be hashed in production
        role: 'admin',
        name: 'Admin User',
        createdAt: new Date()
      };
      
      await db.collection('users').add(adminData);
      console.log('✅ Default admin user created');
    } else {
      console.log('📋 Admin users found:');
      adminsSnapshot.docs.forEach(doc => {
        const user = doc.data();
        console.log(`   - ${user.email} (${user.name})`);
      });
    }
    
    // Also check judges
    const judgesSnapshot = await db.collection('judges')
      .where('active', '==', true)
      .get();
    
    console.log(`\n👨‍⚖️ Found ${judgesSnapshot.size} active judges`);
    
    if (judgesSnapshot.size > 0) {
      console.log('📋 Active judges:');
      judgesSnapshot.docs.forEach(doc => {
        const judge = doc.data();
        console.log(`   - ${judge.name || judge.email} (${judge.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking credentials:', error);
    throw error;
  }
}

// Run the check
checkAdminCredentials()
  .then(() => {
    console.log('\n🚀 Credential check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Credential check failed:', error);
    process.exit(1);
  });


