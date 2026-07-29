const { db } = require('../config/firebase');

class TutorProfileServices {
    // 1. Get Profile
    async getTutorProfile(uid) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) return null;
        return doc.data();
    }

    // 2. Secure Profile Update
    async updateTutorProfile(uid, profileData) {
        const userRef = db.collection('users').doc(uid);
        
        if (profileData.phone) {
            const cleanPhone = profileData.phone.replace(/\s+/g, '').replace(/-/g, '');
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

    // 3. Delete Tutor Account & Subcollections
    async deleteTutorAccount(uid) {
        try {
            const userRef = db.collection('users').doc(uid);
            const cardsSnapshot = await userRef.collection('bankCards').get();
            
            if (!cardsSnapshot.empty) {
                const batch = db.batch();
                cardsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            await userRef.delete();

            return { success: true, message: 'Tutor data deleted successfully' };
        } catch (error) {
            throw new Error(`Firebase DB Error: ${error.message}`);
        }
    }
    
    // 4. Get Bank Cards
    async getBankCards(uid) {
        const cardsSnapshot = await db.collection('users').doc(uid).collection('bankCards').get();
        const cards = [];
        cardsSnapshot.forEach(doc => { cards.push({ id: doc.id, ...doc.data() }); });
        return cards;
    }
    
    // 5. Add Bank Card
    async addBankCard(uid, cardData) {
        const cardsRef = db.collection('users').doc(uid).collection('bankCards');
        
        const cardsSnapshot = await cardsRef.get();
        if (!cardsSnapshot.empty) {
            throw new Error('You can only add a maximum of 1 bank account for payouts.');
        }

        const { bankName, accountNo, accountHolder } = cardData;

        const cleanAccountNo = accountNo.replace(/\s+/g, '').replace(/-/g, '');
        const isOnlyDigits = /^\d+$/.test(cleanAccountNo);

        if (!isOnlyDigits || cleanAccountNo.length < 9 || cleanAccountNo.length > 16) {
            throw new Error('Invalid Bank Account Number. Please enter a valid number.');
        }

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
    
    // 6. Delete Bank Card
    async deleteBankCard(uid, cardId) {
        const cardRef = db.collection('users').doc(uid).collection('bankCards').doc(cardId);
        await cardRef.delete();
        return { success: true, message: 'Bank account disconnected successfully' };
    }

    // NEW FUNCTION 1: tutor_applications එකෙන් cv_url එක ලබා ගැනීම
    async getTutorQualification(uid) {
        const snapshot = await db.collection('tutor_applications')
            .where('user_id', '==', uid)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        return { appId: doc.id, ...doc.data() };
    }

    // NEW FUNCTION 2: tutor_applications එකේ cv_url Update කිරීම
    async updateTutorQualification(uid, cvUrl) {
        const snapshot = await db.collection('tutor_applications')
            .where('user_id', '==', uid)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new Error('No registration record found in tutor_applications.');
        }

        const docRef = snapshot.docs[0].ref;
        await docRef.update({
            cv_url: cvUrl,
            updated_at: new Date().toISOString()
        });

        return { success: true, message: 'Qualification certificate updated successfully' };
    }
}

module.exports = new TutorProfileServices();