const { db } = require('../config/firebase');

// පේමන්ට් එකක් අලුතින් Firestore එකට දාන්න
const addPayout = async (payoutData) => {
    return await db.collection('payouts').add({
        ...payoutData,
        createdAt: new Date(),
        status: 'Pending'
    });
};

// ටියුටර්ගේ බැංකු විස්තර ගන්න (tutors collection එකෙන්)
const getTutorBankDetails = async (tutorId) => {
    const tutorDoc = await db.collection('tutors').doc(tutorId).get();
    if (!tutorDoc.exists) return null;
    return tutorDoc.data();
};

module.exports = { addPayout, getTutorBankDetails };