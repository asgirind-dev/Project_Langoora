const { db } = require('../config/firebase');

class TutorProfileServices {
    async getTutorProfile(uid) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) return null;
        return doc.data();
    }

    // 2. Profile එක ආරක්ෂිතව Update කිරීම (ඩේටා මැකෙන්නේ නැත)
    // 2. Profile එක ආරක්ෂිතව Update කිරීම (ඩේටා මැකෙන්නේ නැත)
    async updateTutorProfile(uid, profileData) {
        const userRef = db.collection('users').doc(uid);
        
        const updatePayload = {};

        // 💡 ඩේටා ඔක්කොම තියෙන්නේ Root fields විදිහට නිසා සාමාන්‍ය විදිහට චෙක් කරලා payload එකට දානවා
        if (profileData.name) updatePayload.name = profileData.name;
        if (profileData.phone) updatePayload.phone = profileData.phone;
        if (profileData.address) updatePayload.address = profileData.address;
        if (profileData.profilePicUrl) updatePayload.profilePicUrl = profileData.profilePicUrl;
        if (profileData.qualifications) updatePayload.qualifications = profileData.qualifications;
        if (profileData.university) updatePayload.university = profileData.university;

        // payload එක හිස් නැත්නම් විතරක් update කරන්න
        if (Object.keys(updatePayload).length > 0) {
            await userRef.update(updatePayload);
        }

        return { success: true, message: 'Profile updated successfully' };
    }

    // Bank card වැඩ ටික කලින් තිබ්බා වගේමයි...
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