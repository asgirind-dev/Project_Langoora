// backend/seedRoles.js
const { db } = require('./config/firebase');

// ----- Define default roles (matching the recommended RBAC structure) -----
const defaultRoles = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    level: 1,
    permissions: {
      manage_users: true,
      manage_roles: true,
      approve_tutors: true,
      view_reports: true,
      manage_exams: true,
      manage_finance: true,
      manage_system: true
    }
  },
  {
    id: 'admin',
    name: 'Admin',
    level: 2,
    permissions: {
      manage_users: true,
      manage_roles: false,
      approve_tutors: false,
      view_reports: true,
      manage_exams: true,
      manage_finance: true,
      manage_system: false
    }
  },
  {
    id: 'sub_admin',
    name: 'Sub Admin',
    level: 3,
    permissions: {
      manage_users: true,
      manage_roles: false,
      approve_tutors: false,
      view_reports: true,
      manage_exams: false,
      manage_finance: false,
      manage_system: false
    }
  },
  {
    id: 'validator',
    name: 'Validator',
    level: 4,
    permissions: {
      approve_tutors: true,
      manage_exams: false,
      manage_finance: false,
      manage_system: false
    }
  },
  {
    id: 'finance',
    name: 'Finance Admin',
    level: 4,
    permissions: {
      manage_finance: true,
      manage_system: false
    }
  },
  {
    id: 'tutor',
    name: 'Tutor',
    level: 5,
    permissions: {}
  },
  {
    id: 'student',
    name: 'Student',
    level: 5,
    permissions: {}
  }
];

// ----- Seed function -----
const seedRoles = async () => {
  try {
    console.log('🔍 Checking if roles already exist...');

    // Check if any role document exists
    const snapshot = await db.collection('roles').limit(1).get();
    if (!snapshot.empty) {
      console.log('⚠️ Roles already exist in Firestore. Skipping seeding.');
      console.log('📋 To force re‑seed, delete the "roles" collection first.');
      return;
    }

    console.log('📝 Creating default roles...');
    const batch = db.batch();

    for (const role of defaultRoles) {
      const { id, ...roleData } = role; // Remove 'id' from data (it becomes the document ID)
      roleData.createdAt = new Date().toISOString();
      roleData.createdBy = 'system'; // System-created roles
      const docRef = db.collection('roles').doc(id);
      batch.set(docRef, roleData);
    }

    await batch.commit();
    console.log('✅ Default roles created successfully!');

    // Optional: List all created roles
    const created = await db.collection('roles').get();
    console.log('\n📋 Created roles:');
    created.forEach(doc => {
      console.log(`  - ${doc.id}: ${doc.data().name} (level ${doc.data().level})`);
    });
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
  }
};

// Run the seeder
seedRoles();