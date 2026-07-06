const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('../firebase-key.json'); 

let app;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'langoora.appspot.com' 
  });
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app).bucket(); // 👈 Storage bucket එක සෙට් කළා

module.exports = { db, auth, storage };