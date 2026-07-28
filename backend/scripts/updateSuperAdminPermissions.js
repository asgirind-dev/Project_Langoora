// backend/scripts/updateSuperAdminPermissions.js
const path = require('path');

// ✅ Load environment variables first
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ✅ Use absolute path for config
const { db } = require('../config/firebase');

const updateSuperAdminPermissions = async () => {
  try {
    console.log('🔍 Looking for admin user...');
    
    // Find the super admin user by email
    const snapshot = await db.collection('users')
      .where('email', '==', 'admin@novacore.com')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Admin user not found by email!');
      console.log('🔍 Trying to find by role...');
      
      // Try finding by role
      const roleSnapshot = await db.collection('users')
        .where('role', '==', 'super_admin')
        .get();
      
      if (roleSnapshot.empty) {
        console.log('❌ No super_admin user found!');
        console.log('📋 Available users:');
        
        // Show all users for debugging
        const allUsers = await db.collection('users').limit(5).get();
        allUsers.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${data.email} (${data.role || 'no role'})`);
        });
        return;
      }
      
      // Use the first super_admin found
      const doc = roleSnapshot.docs[0];
      const data = doc.data();
      console.log(`✅ Found super_admin: ${data.email}`);
      
      await updateUserPermissions(doc);
      return;
    }

    // Update the admin user
    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log(`✅ Found user: ${data.email}`);
    console.log(`📋 Current role: ${data.role}`);
    console.log(`📋 Current permissions:`, data.permissions || []);
    
    await updateUserPermissions(doc);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
};

const updateUserPermissions = async (doc) => {
  try {
    const data = doc.data();
    console.log('📋 Current permissions:', data.permissions || []);
    
    // ✅ ALL permissions for Super Admin
    const allPermissions = [
      // System Administration
      'manage_users',
      'manage_roles',
      'manage_system',
      'view_audit_logs',
      // Academic Operations
      'verify_tutors',
      'audit_exams',
      'manage_questions',
      'approve_content',
      'resolve_disputes',
      // Financial Operations
      'manage_subscriptions',
      'approve_payouts',
      'view_ledger',
      'manage_credits',
      'process_refunds',
      // Content Management
      'create_exams',
      'manage_own_content',
      'view_student_progress',
      // General Access
      'view_reports',
      'view_own_profile'
    ];
    
    // Remove duplicates
    const uniquePermissions = [...new Set(allPermissions)];
    
    // Update the document
    await doc.ref.update({
      permissions: uniquePermissions,
      role: 'super_admin',
      roleId: 'super_admin',
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Permissions updated successfully!');
    console.log(`📋 New permissions (${uniquePermissions.length}):`, uniquePermissions);
    
    // Verify the update
    const updatedDoc = await doc.ref.get();
    const verifiedData = updatedDoc.data();
    console.log('📋 Verified permissions:', verifiedData.permissions);
    console.log('📋 Verified role:', verifiedData.role);
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
};

// Run the function
updateSuperAdminPermissions()
  .then(() => {
    console.log('✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });