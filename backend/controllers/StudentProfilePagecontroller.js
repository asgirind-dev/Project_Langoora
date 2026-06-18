const studentService = require('../services/StudentProfilePageservices');

class StudentProfilePageController {
    // 1. Get Profile
    async getStudentProfile(req, res) {
    try {
        const { uid } = req.params;
        
        // 1. UID එකක් ආවේ නැත්නම් මෙතනින්ම Response එකක් දෙනවා
        if (!uid) {
            return res.status(400).json({ success: false, message: 'UID is required' });
        }

        const profile = await studentService.getStudentProfile(uid);
        
        // 2. Profile එකක් නැත්නම් හිස් Object එකක් හරි සාර්ථකව යවනවා (නැත්නම් හිරවෙනවා)
        if (!profile) {
            return res.status(200).json({ success: true, data: {} }); 
        }
        
        return res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

    // 2. Update Profile & Picture (Base64 හෝ වෙනත් URL එකක් ලෙස)
    async updateStudentProfile(req, res) {
        try {
            const { uid } = req.params;
            const profileData = req.body;

            const result = await studentService.updateStudentProfile(uid, profileData);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 3. Delete Bank Details
    async deleteBankDetails(req, res) {
        try {
            const { uid } = req.params;
            const result = await studentService.deleteBankDetails(uid);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new StudentProfilePageController();