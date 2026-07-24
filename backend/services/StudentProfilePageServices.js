const { db } = require('../config/firebase');

class StudentProfileServices {
    // 1. Get Student Profile
    async getStudentProfile(uid) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) return null;
        
        const data = doc.data();
        if (data.password) delete data.password; // Safeguard clear-text exposures over cross-origin headers
        return data;
    }

    // 2. Update Student Profile (With Data Masking & Phone Validation Filters)
    async updateStudentProfile(uid, profileData) {
        const userRef = db.collection('users').doc(uid);
        const updatePayload = {};

        // A. Phone Validation Guard Rails
        if (profileData.phone) {
            const cleanPhone = profileData.phone.replace(/\s+/g, '').replace(/-/g, '');
            const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;
            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Invalid Sri Lankan mobile format registry. Use 07xxxxxxxx pattern.');
            }
        }

        // B. Mapping Native Form properties securely
        if (profileData.name !== undefined) updatePayload.name = profileData.name;
        if (profileData.phone !== undefined) updatePayload.phone = profileData.phone;
        if (profileData.dob !== undefined) updatePayload.dob = profileData.dob;
        if (profileData.city !== undefined) updatePayload.city = profileData.city;
        if (profileData.targetExam !== undefined) updatePayload.targetExam = profileData.targetExam;
        if (profileData.targetDate !== undefined) updatePayload.targetDate = profileData.targetDate;
        if (profileData.profilePicUrl !== undefined) updatePayload.profilePicUrl = profileData.profilePicUrl;
        
        // C. Card Security Masking Engine (Tutor Style Alignment!)
        if (profileData.accountNo) {
            const cleanAcc = profileData.accountNo.replace(/\s+/g, '').replace(/-/g, '');
            if (/^\d+$/.test(cleanAcc) && cleanAcc.length >= 9 && cleanAcc.length <= 15) {
                // If it's already masked by database recall, skip encryption routing loop
                if (!profileData.accountNo.startsWith('****')) {
                    const lastFourDigits = cleanAcc.slice(-4);
                    updatePayload.accountNo = `**** **** ${lastFourDigits}`;
                }
            } else if (!profileData.accountNo.startsWith('****')) {
                throw new Error('Invalid numeric card block length constraint (9-15 digits required).');
            }
        }

        if (profileData.bankName !== undefined) updatePayload.bankName = profileData.bankName;
        if (profileData.accountHolder !== undefined) updatePayload.accountHolder = profileData.accountHolder;

        if (Object.keys(updatePayload).length > 0) {
            await userRef.update(updatePayload);
        }

        return { success: true, message: 'Student profile cluster updated successfully' };
    }

    // 3. Remove Bank Details Only
    async deleteBankDetails(uid) {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
            bankName: "",
            accountNo: "",
            accountHolder: ""
        });
        return { success: true, message: 'Bank credentials erased from cluster node.' };
    }

    // 4. NEW: PURGE STUDENT DOCUMENT ENTIRELY FROM USER DATABASE (Danger Zone)
    async deleteStudentAccount(uid) {
        try {
            const userRef = db.collection('users').doc(uid);
            await userRef.delete();
            return { success: true, message: 'Student profile workspace purged from Langoora server node registry.' };
        } catch (error) {
            throw new Error(`Failed inside database student account transaction process: ${error.message}`);
        }
    }
}

module.exports = new StudentProfileServices();