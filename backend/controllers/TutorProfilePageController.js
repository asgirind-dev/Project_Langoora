const tutorService = require('../services/TutorProfileServices');

class TutorProfilePageController {
    // 1. Get Profile
    async getTutorProfile(req, res) {
        try {
            const { uid } = req.params;
            const profile = await tutorService.getTutorProfile(uid);
            if (!profile) {
                return res.status(404).json({ success: false, message: 'Tutor not found' });
            }
            return res.status(200).json({ success: true, data: profile });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 2. Update Profile (including Profile Pic)
    async updateTutorProfile(req, res) {
        try {
            const { uid } = req.params;
            const profileData = req.body; 

            const result = await tutorService.updateTutorProfile(uid, profileData);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 3. Delete Tutor Account
    async deleteTutorAccount(req, res) {
        try {
            const { uid } = req.params;
            
            // Forwarding the validated UID directly to the profile services layer
            const result = await tutorService.deleteTutorAccount(uid);
            
            // If the service fails internally, respond with a 400 Bad Request instead of breaking with a 500 status
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error("🔥 CRITICAL BACKEND ERROR IN CONTROLLER:", error); 
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    

    // 4. Get Bank Cards
    async getBankCards(req, res) {
        try {
            const { uid } = req.params;
            const cards = await tutorService.getBankCards(uid);
            return res.status(200).json({ success: true, data: cards });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 5. Add Bank card
    async addBankCard(req, res) {
        try {
            const { uid } = req.params;
            const cardData = req.body;
            const newCard = await tutorService.addBankCard(uid, cardData);
            return res.status(201).json({ success: true, data: newCard });
        } catch (error) {
            // Catch service validation exceptions and return a clean 400 Bad Request instead of an unhandled 500 error
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    // 6. Delete Bank Card
    async deleteBankCard(req, res) {
        try {
            const { uid, cardId } = req.params;
            const result = await tutorService.deleteBankCard(uid, cardId);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new TutorProfilePageController();