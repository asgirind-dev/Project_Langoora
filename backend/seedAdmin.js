const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');


const serviceAccount = require('./firebase-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const seedAdminUser = async () => {
  try {
    const adminEmail = 'admin@novacore.com';
    
    
    const userSnapshot = await db.collection('users')
      .where('email', '==', adminEmail)
      .get();

    if (userSnapshot.empty) {
      
      const hashedPassword = await bcrypt.hash('Admin@NOVACORE2026', 10);

      const adminData = {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword, 
        role: 'admin',
        institution: 'Internal Operations',
        status: 'active',
        joined: new Date().toISOString().split('T')[0],
        activityCount: 0
      };

      
      await db.collection('users').add(adminData);
      console.log('✅ Super Admin Account Seeded to Firestore Successfully!');
    } else {
      console.log('ℹ️ Admin account already exists in Firestore. Skipping.');
    }
  } catch (error) {
    console.error('❌ Error seeding admin to Firestore:', error);
  } finally {
    process.exit(); 
  }
};


seedAdminUser();