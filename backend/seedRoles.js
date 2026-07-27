// backend/seedRoles.js
// Run: node backend/seedRoles.js

const { db } = require('./config/firebase');

// ================================================================
// ✅ ROLES CONFIGURATION - UPDATED (Matches your requirements)
// ================================================================
const ROLES_CONFIG = {
  super_admin: {
    name: 'Super Admin',
    level: 1,
    permissions: {
      manage_users: true,
      manage_roles: true,
      manage_system: true,
      view_audit_logs: true,
      view_reports: true,
      approve_tutors: true,
      manage_exams: true,
      manage_finance: true,
      view_own_profile: true
    }
  },
  admin: {
    name: 'Admin',
    level: 2,
    permissions: {
      manage_users: true,
      manage_system: true,
      view_audit_logs: true,
      view_reports: true,
      approve_tutors: true,
      view_own_profile: true
    }
  },
  sub_admin: {
    name: 'Sub Admin',
    level: 3,
    permissions: {
      manage_users: true,
      view_reports: true,
      view_own_profile: true
    }
  },
  validator: {
    name: 'Validator',
    level: 4,
    permissions: {
      verify_tutors: true,
      audit_exams: true,
      view_own_profile: true
    }
  },
  finance: {
    name: 'Finance Admin',
    level: 4,
    permissions: {
      manage_subscriptions: true,
      manage_credits: true,
      approve_payouts: true,
      view_reports: true,
      view_own_profile: true
    }
  },
  tutor: {
    name: 'Tutor',
    level: 5,
    permissions: {
      create_exams: true,
      manage_own_content: true,
      view_student_progress: true,
      view_reports: true,
      view_own_profile: true
    }
  },
  student: {
    name: 'Student',
    level: 5,
    permissions: {
      view_own_profile: true
    }
  }
};

// ================================================================
// ✅ SEED FUNCTION
// ================================================================
const seedRoles = async () => {
  console.log('🔄 Starting roles seed...');
  console.log('📋 Roles to seed:', Object.keys(ROLES_CONFIG).length);

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const [roleId, roleData] of Object.entries(ROLES_CONFIG)) {
      const roleRef = db.collection('roles').doc(roleId);
      const roleDoc = await roleRef.get();

      const payload = {
        name: roleData.name,
        level: roleData.level,
        permissions: roleData.permissions,
        updatedAt: new Date().toISOString()
      };

      if (roleDoc.exists) {
        // ✅ Update existing role
        await roleRef.update(payload);
        updatedCount++;
        console.log(`✅ Updated role: ${roleId} (${roleData.name})`);
      } else {
        // ✅ Create new role
        payload.createdAt = new Date().toISOString();
        payload.createdBy = 'system';
        await roleRef.set(payload);
        createdCount++;
        console.log(`✅ Created role: ${roleId} (${roleData.name})`);
      }

      // ✅ Log permissions
      const permKeys = Object.keys(roleData.permissions).filter(k => roleData.permissions[k] === true);
      console.log(`   📋 Permissions (${permKeys.length}): ${permKeys.join(', ') || 'none'}`);
      console.log('');
    }

    console.log('✅ Seed completed successfully!');
    console.log(`📊 Created: ${createdCount}, Updated: ${updatedCount}`);

    // ✅ List all roles after seed
    console.log('\n📋 All roles in Firestore:');
    const snapshot = await db.collection('roles').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const permCount = Object.keys(data.permissions || {}).filter(k => data.permissions[k] === true).length;
      console.log(`  - ${doc.id}: ${data.name} (level ${data.level}, ${permCount} permissions)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
};

// ================================================================
// ✅ RUN SEED
// ================================================================
seedRoles();