// backend/routes/tutorReviewRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getTutorReviews } = require('../services/tutorReviewService');

/**
 * Get tutor reviews with aggregated stats
 * GET /api/tutor-reviews/:tutorId
 */
router.get('/:tutorId', protect, async (req, res) => {
  try {
    const { tutorId } = req.params;
    const data = await getTutorReviews(tutorId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get tutor reviews error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;