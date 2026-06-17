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
            const profileData = req.body; // මෙතනට profilePic URL එකත් ඇතුලත් වෙන්න ඕනේ

            const result = await tutorService.updateTutorProfile(uid, profileData);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 3. Get Bank Cards
    async getBankCards(req, res) {
        try {
            const { uid } = req.params;
            const cards = await tutorService.getBankCards(uid);
            return res.status(200).json({ success: true, data: cards });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 4. Add Bank Card
    async addBankCard(req, res) {
        try {
            const { uid } = req.params;
            const cardData = req.body;
            const newCard = await tutorService.addBankCard(uid, cardData);
            return res.status(201).json({ success: true, data: newCard });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 5. Delete Bank Card
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