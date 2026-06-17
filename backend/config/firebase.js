const admin = require('firebase-admin');

// Try to load service account
let serviceAccount;
try {
  serviceAccount = require('../firebase-key.json');
  console.log('✅ firebase-key.json loaded');
} catch (error) {
  console.error('❌ firebase-key.json not found!');
  console.log('Please download service account key from Firebase Console');
  console.log('And save it as: backend/firebase-key.json');
  process.exit(1);
}

// Initialize Firebase
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully!');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };