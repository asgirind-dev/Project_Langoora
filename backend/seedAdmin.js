const { db, auth } = require('./config/firebase'); // 💡 auth එකත් Import කරගත්තා

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@novacore.com';
    const adminPassword = 'Admin@NOVACORE2026'; // Real operational password

    // Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
      console.log('ℹ️ Admin already exists in Firebase Authentication infrastructure.');
    } catch (authError) {
      // If user does not exist, code will drop here (auth/user-not-found)
      if (authError.code === 'auth/user-not-found') {
        // 🔒 Securely provision the user node inside Firebase Auth layer first
        userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'System Administrator',
          emailVerified: true
        });
        console.log('✅ Admin user account provisioned in Auth layer.');
      } else {
        throw authError;
      }
    }

    // Now, synchronize and save/update the profile structure inside Firestore
    // 💡 .add() වෙනුවට .doc(uid).set() පාවිච්චි කරලා ID දෙක සමාන කළා
    const userProfileRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userProfileRef.get();

    if (!userDoc.exists) {
      await userProfileRef.set({
        uid: userRecord.uid,
        name: 'System Administrator',
        email: adminEmail,
        role: 'admin',
        status: 'active',
        credits: 0,
        joined: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
      console.log('✅ Admin profile synced with Firestore registry infrastructure successfully!');
      console.log('📧 Email: admin@novacore.com');
      console.log('🔑 Password: Admin@NOVACORE2026');
    } else {
      console.log('ℹ️ Admin profile document already established in Firestore metadata collection.');
    }

  } catch (error) {
    console.error('❌ Critical error during administrative seeding operational matrix:', error);
  }
};

seedAdmin();