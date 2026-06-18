const { db } = require('../config/firebase');

class StudentProfileServices {
    // 1. Get Student Profile
    async getStudentProfile(uid) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) return null;
        return doc.data();
    }

    // 2. Update Student Profile (Personal, Goals & Bank Details)
    async updateStudentProfile(uid, profileData) {
        const userRef = db.collection('users').doc(uid);
        const updatePayload = {};

        // Root fields චෙක් කරලා payload එකට දානවා (ඩේටා මැකී නොයෑමට)
        if (profileData.name !== undefined) updatePayload.name = profileData.name;
        if (profileData.phone !== undefined) updatePayload.phone = profileData.phone;
        if (profileData.dob !== undefined) updatePayload.dob = profileData.dob;
        if (profileData.city !== undefined) updatePayload.city = profileData.city;
        if (profileData.targetExam !== undefined) updatePayload.targetExam = profileData.targetExam;
        if (profileData.targetDate !== undefined) updatePayload.targetDate = profileData.targetDate;
        if (profileData.profilePicUrl !== undefined) updatePayload.profilePicUrl = profileData.profilePicUrl;
        
        // Bank info fields
        if (profileData.bankName !== undefined) updatePayload.bankName = profileData.bankName;
        if (profileData.accountNo !== undefined) updatePayload.accountNo = profileData.accountNo;
        if (profileData.accountHolder !== undefined) updatePayload.accountHolder = profileData.accountHolder;

        if (Object.keys(updatePayload).length > 0) {
            await userRef.update(updatePayload);
        }

        return { success: true, message: 'Student profile updated successfully' };
    }

    // 3. Remove Bank Details Only
    async deleteBankDetails(uid) {
        const userRef = db.collection('users').doc(uid);
        
        await userRef.update({
            bankName: "",
            accountNo: "",
            accountHolder: ""
        });

        return { success: true, message: 'Bank details removed successfully' };
    }
}

module.exports = new StudentProfileServices();