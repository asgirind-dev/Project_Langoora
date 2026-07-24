// backend/updateAdminRole.js
const { db } = require('./config/firebase');

const updateAdminRole = async () => {
  try {
    const adminEmail = 'admin@novacore.com';

    // Find the admin user document
    const snapshot = await db.collection('users').where('email', '==', adminEmail).get();

    if (snapshot.empty) {
      console.log('❌ Admin user not found in Firestore.');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('📋 Current admin data:');
    console.log(`  - Role: ${data.role}`);
    console.log(`  - RoleId: ${data.roleId || 'NOT SET'}`);

    // Update the document
    await doc.ref.update({
      roleId: 'super_admin',
      // Keep 'role' for backward compatibility, but also set it to 'super_admin'
      role: 'super_admin',
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Admin role updated successfully!');
    console.log(`   Document ID: ${doc.id}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   New Role: super_admin`);

    // Verify the update
    const updatedDoc = await doc.ref.get();
    const updatedData = updatedDoc.data();
    console.log('\n📋 Updated admin data:');
    console.log(`  - Role: ${updatedData.role}`);
    console.log(`  - RoleId: ${updatedData.roleId}`);

  } catch (error) {
    console.error('❌ Update failed:', error);
  }
};

updateAdminRole();