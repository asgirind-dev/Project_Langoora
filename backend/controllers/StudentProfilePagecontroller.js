const studentService = require('../services/StudentProfilePageServices'); 

class StudentProfilePageController {
    // 1. Get Profile
    async getStudentProfile(req, res) {
        try {
            const { uid } = req.params;
            
            if (!uid) {
                return res.status(400).json({ success: false, message: 'UID is required' });
            }

            const profile = await studentService.getStudentProfile(uid);
            
            if (!profile) {
                return res.status(200).json({ success: true, data: {} }); 
            }

            // FIXED: Added missing return statement for successful profile retrieval
            return res.status(200).json({ success: true, data: profile });

        } catch (error) {
            // FIXED: Added missing catch block to handle runtime exceptions safely
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 2. Update Profile
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