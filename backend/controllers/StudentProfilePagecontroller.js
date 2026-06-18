const studentService = require('../services/StudentProfilePageServices'); 

class StudentProfilePageController {
    
    // 1. Get Profile
    async getStudentProfile(req, res) {
        try {
            const { uid } = req.params;
            if (!uid) {
                return res.status(400).json({ success: false, message: 'UID is required parameters.' });
            }

            const profile = await studentService.getStudentProfile(uid);
            if (!profile) {
                return res.status(200).json({ success: true, data: {} }); 
            }
            return res.status(200).json({ success: true, data: profile });
        } catch (error) { 
            console.error("Error in getStudentProfile:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 2. Update Profile (With integrated Base64 Card number masking triggers)
    async updateStudentProfile(req, res) {
        try {
            const { uid } = req.params;
            const profileData = req.body;

            const result = await studentService.updateStudentProfile(uid, profileData);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message }); // Sends clean bad-request messages
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

    // 🛑 4. NEW: DELETE STUDENT ACCOUNT CORE PIPELINE (Danger Zone Sync)
    async deleteStudentAccount(req, res) {
        try {
            const { uid } = req.params;
            if (!uid) {
                return res.status(400).json({ success: false, error: "UID verification tracking code failed." });
            }
            
            const result = await studentService.deleteStudentAccount(uid);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("🔥 CRITICAL BACKEND EXCEPTION IN STUDENT ERASER CONTROLLER:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new StudentProfilePageController();