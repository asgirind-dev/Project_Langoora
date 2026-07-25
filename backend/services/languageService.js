const { db } = require('../config/firebase');

/**
 * 📚 Fetch Active Exam Categories with their levels from Firebase
 */
const fetchActiveExamSchema = async () => {
  try {
    // Get all exam categories
    const categoriesSnapshot = await db.collection('exam_categories')
      .where('status', '==', 'active')
      .get();
    
    const categories = [];
    
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      const categoryId = doc.id;
      
      // Get levels sub-collection for this category
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories')
          .doc(categoryId)
          .collection('levels')
          .where('status', '==', 'active')
          .get();
        
        levels = levelsSnapshot.docs.map(levelDoc => ({
          id: levelDoc.id,
          ...levelDoc.data()
        }));
      } catch (levelError) {
        console.log(`No levels found for category: ${categoryId}`);
        levels = [];
      }
      
      categories.push({
        id: categoryId,
        ...categoryData,
        levels: levels
      });
    }
    
    return {
      success: true,
      schema: categories
    };
    
  } catch (error) {
    console.error('Fetch Active Exam Schema Error:', error);
    throw new Error('Failed to fetch active exam schema from database.');
  }
};

/**
 * 🔍 Get a specific exam category with its levels
 */
const getExamCategoryWithLevels = async (categoryId) => {
  try {
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    
    if (!categoryDoc.exists) {
      throw new Error('Category not found');
    }
    
    const categoryData = categoryDoc.data();
    
    // Get levels
    const levelsSnapshot = await db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .where('status', '==', 'active')
      .get();
    
    const levels = levelsSnapshot.docs.map(levelDoc => ({
      id: levelDoc.id,
      ...levelDoc.data()
    }));
    
    return {
      success: true,
      category: {
        id: categoryDoc.id,
        ...categoryData,
        levels: levels
      }
    };
    
  } catch (error) {
    console.error('Get Category Error:', error);
    throw new Error(error.message);
  }
};

module.exports = {
  fetchActiveExamSchema,
  getExamCategoryWithLevels
};