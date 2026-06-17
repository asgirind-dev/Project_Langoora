const { db } = require('./config/firebase');

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@novacore.com';
    const existing = await db.collection('users').where('email', '==', adminEmail).get();
    
    if (!existing.empty) {
      console.log('ℹ️ Admin already exists');
      return;
    }

    await db.collection('users').add({
      name: 'System Administrator',
      email: adminEmail,
      role: 'admin',
      status: 'active',
      credits: 0,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Admin created successfully!');
    console.log('📧 Email: admin@novacore.com');
    console.log('🔑 Password: Admin@NOVACORE2026');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

seedAdmin();