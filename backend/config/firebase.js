const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('../firebase-key.json'); 

let app;


if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  app = getApp();
}


const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { db, auth };