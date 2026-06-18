const { db } = require('../config/firebase');

class TutorProfileServices {
    async getTutorProfile(uid) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) return null;
        return doc.data();
    }

    
    async updateTutorProfile(uid, profileData) {
        const userRef = db.collection('users').doc(uid);
        
        const updatePayload = {};

        
        if (profileData.name) updatePayload.name = profileData.name;
        if (profileData.phone) updatePayload.phone = profileData.phone;
        if (profileData.address) updatePayload.address = profileData.address;
        if (profileData.profilePicUrl) updatePayload.profilePicUrl = profileData.profilePicUrl;
        if (profileData.qualifications) updatePayload.qualifications = profileData.qualifications;
        if (profileData.university) updatePayload.university = profileData.university;

        
        if (Object.keys(updatePayload).length > 0) {
            await userRef.update(updatePayload);
        }

        return { success: true, message: 'Profile updated successfully' };
    }
    

    
    async getBankCards(uid) {
        const cardsSnapshot = await db.collection('users').doc(uid).collection('bankCards').get();
        const cards = [];
        cardsSnapshot.forEach(doc => { cards.push({ id: doc.id, ...doc.data() }); });
        return cards;
    }
    async addBankCard(uid, cardData) {
        const cardsRef = db.collection('users').doc(uid).collection('bankCards');
        const newCardRef = await cardsRef.add(cardData);
        return { id: newCardRef.id, ...cardData };
    }
    async deleteBankCard(uid, cardId) {
        const cardRef = db.collection('users').doc(uid).collection('bankCards').doc(cardId);
        await cardRef.delete();
        return { success: true, message: 'Bank card deleted successfully' };
    }
}

module.exports = new TutorProfileServices();