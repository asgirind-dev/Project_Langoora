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
        
        // Phone Number Validation: Checked only if a phone number field is explicitly supplied
        if (profileData.phone) {
            const cleanPhone = profileData.phone.replace(/\s+/g, '').replace(/-/g, ''); // Removes spaces and hyphens
            const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
            
            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Invalid Sri Lankan phone number format. Use 07xxxxxxxx or +947xxxxxxxx.');
            }
        }

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


    async deleteTutorAccount(uid) {
        try {
            const userRef = db.collection('users').doc(uid);
            await userRef.delete();
            return { success: true, message: 'Tutor account deleted successfully' };
        } catch (error) {
            throw new Error(`Failed to delete tutor account: ${error.message}`);
        }
    }

    async getBankCards(uid) {
        const cardsSnapshot = await db.collection('users').doc(uid).collection('bankCards').get();
        const cards = [];
        cardsSnapshot.forEach(doc => { cards.push({ id: doc.id, ...doc.data() }); });
        return cards;
    }
    
    async addBankCard(uid, cardData) {
        const cardsRef = db.collection('users').doc(uid).collection('bankCards');
        
        // 1. Max Card Limit Check: Verify if a linked payout record already exists
        const cardsSnapshot = await cardsRef.get();
        if (!cardsSnapshot.empty) {
            throw new Error('You can only add a maximum of 1 bank card for payouts.');
        }

        const { bankName, accountNo, accountHolder } = cardData;

        // 2. Card Number Validation (Ensures strict numerical compliance between 12 and 19 characters)
        const cleanAccountNo = accountNo.replace(/\s+/g, '').replace(/-/g, '');
        const isOnlyDigits = /^\d+$/.test(cleanAccountNo);

        if (!isOnlyDigits || cleanAccountNo.length < 12 || cleanAccountNo.length > 19) {
            throw new Error('Invalid Card/Account Number. Please enter a valid number containing 12 to 19 digits.');
        }

        // 3. Card Masking: Isolates the final trailing 4 digits to prevent clear-text sensitive exposures
        const lastFourDigits = cleanAccountNo.slice(-4);
        const maskedAccountNo = `**** **** **** ${lastFourDigits}`;

        const secureCardData = {
            bankName,
            accountNo: maskedAccountNo, 
            accountHolder,
            createdAt: new Date()
        };

        const newCardRef = await cardsRef.add(secureCardData);
        return { id: newCardRef.id, ...secureCardData };
    }
    
    async deleteBankCard(uid, cardId) {
        const cardRef = db.collection('users').doc(uid).collection('bankCards').doc(cardId);
        await cardRef.delete();
        return { success: true, message: 'Bank card deleted successfully' };
    }
}

module.exports = new TutorProfileServices();