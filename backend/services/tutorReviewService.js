// backend/services/tutorReviewService.js
const { db } = require('../config/firebase');

/**
 * Get all reviews for a tutor with aggregated stats
 */
const getTutorReviews = async (tutorId) => {
  try {
    console.log(`🔍 Fetching reviews for tutorId: "${tutorId}"`);
    
    if (!tutorId) {
      throw new Error('Tutor ID is required');
    }

    // ✅ Query with orderBy (index now enabled)
    const feedbackSnapshot = await db.collection('exam_feedback')
      .where('tutorId', '==', tutorId)
      .orderBy('submittedAt', 'desc')
      .get();
    
    console.log(`📊 Found ${feedbackSnapshot.size} documents`);
    
    const reviews = [];
    feedbackSnapshot.forEach(doc => {
      const data = doc.data();
      // ✅ Ensure studentName and studentAvatar are included
      reviews.push({ 
        id: doc.id, 
        ...data,
        studentName: data.studentName || 'Anonymous',
        studentAvatar: data.studentAvatar || null
      });
    });
    
    console.log(`✅ Total reviews processed: ${reviews.length}`);

    // ✅ If no reviews, return empty stats
    if (reviews.length === 0) {
      console.log('📊 No reviews found for this tutor');
      return {
        tutorId,
        totalReviews: 0,
        averageRating: 0,
        breakdown: [0, 0, 0, 0, 0].map((count, index) => ({
          stars: index + 1,
          count: 0,
          percentage: 0
        })),
        difficultyCounts: {
          'Very Easy': 0,
          'Easy': 0,
          'Moderate': 0,
          'Hard': 0,
          'Very Hard': 0
        },
        examGroups: [],
        reviews: []
      };
    }
    
    // Calculate aggregated stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews 
      : 0;
    
    // Rating breakdown
    const breakdown = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const rating = r.rating || 0;
      if (rating >= 1 && rating <= 5) {
        breakdown[rating - 1]++;
      }
    });
    
    // Difficulty breakdown
    const difficultyCounts = {
      'Very Easy': 0,
      'Easy': 0,
      'Moderate': 0,
      'Hard': 0,
      'Very Hard': 0
    };
    reviews.forEach(r => {
      if (r.difficulty && difficultyCounts.hasOwnProperty(r.difficulty)) {
        difficultyCounts[r.difficulty]++;
      }
    });
    
    // Group by exam
    const examGroups = {};
    reviews.forEach(r => {
      const key = r.examId || 'unknown';
      if (!examGroups[key]) {
        examGroups[key] = {
          examId: key,
          examTitle: r.examTitle || 'Unknown Exam',
          reviews: [],
          total: 0,
          averageRating: 0
        };
      }
      examGroups[key].reviews.push(r);
      examGroups[key].total++;
    });
    
    // Calculate average per exam
    Object.keys(examGroups).forEach(key => {
      const group = examGroups[key];
      group.averageRating = group.total > 0 
        ? group.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / group.total 
        : 0;
    });
    
    const result = {
      tutorId,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      breakdown: breakdown.map((count, index) => ({
        stars: index + 1,
        count,
        percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
      })),
      difficultyCounts,
      examGroups: Object.values(examGroups),
      reviews: reviews.slice(0, 50) // Limit to 50 most recent
    };
    
    console.log('📊 Final result:', {
      totalReviews: result.totalReviews,
      averageRating: result.averageRating,
      examGroups: result.examGroups.length
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error getting tutor reviews:', error);
    console.error('❌ Stack:', error.stack);
    throw new Error(`Failed to fetch tutor reviews: ${error.message}`);
  }
};

module.exports = { getTutorReviews };