const { db } = require('../config/firebase');

// =========================================================================
// 📚 1. Get Active Languages (Public - No Auth)
// =========================================================================
const getActiveLanguages = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories')
      .where('status', '==', 'active')
      .select('language')
      .get();
    
    const languagesSet = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.language) {
        languagesSet.add(data.language);
      }
    });
    
    const languages = Array.from(languagesSet).map(lang => ({
      name: lang,
      value: lang.toLowerCase()
    }));
    
    return res.status(200).json({
      success: true,
      languages
    });
  } catch (error) {
    console.error('Get Active Languages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active languages.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 2. Get Active Schema with Categories and Levels - FIXED
// =========================================================================
const getActiveSchemaForSystem = async (req, res) => {
  try {
    console.log('📚 Fetching active exam schema...');
    
    const categoriesSnapshot = await db.collection('exam_categories')
      .where('status', '==', 'active')
      .get();
    
    console.log(`📚 Found ${categoriesSnapshot.size} categories`);
    
    const categories = [];
    
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      const categoryId = doc.id;
      
      console.log(`📂 Processing category: ${categoryId}`);
      
      // Get levels sub-collection for this category
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories')
          .doc(categoryId)
          .collection('levels')
          .get(); // 👈 No where clause - get ALL levels
        
        console.log(`📂 Found ${levelsSnapshot.size} levels for ${categoryId}`);
        
        levels = levelsSnapshot.docs.map(levelDoc => {
          const levelData = levelDoc.data();
          return {
            id: levelDoc.id,
            level_name: levelData.level_name || levelData.name || levelDoc.id,
            status: levelData.status || levelData.is_active === 1 ? 'active' : 'inactive',
            credit_cost: levelData.credit_cost || 0,
            isCreditSet: levelData.isCreditSet || false,
            ...levelData
          };
        });
        
        // Sort levels by credit_cost or name
        levels.sort((a, b) => {
          if (a.credit_cost !== b.credit_cost) {
            return (a.credit_cost || 0) - (b.credit_cost || 0);
          }
          return (a.level_name || '').localeCompare(b.level_name || '');
        });
        
      } catch (levelError) {
        console.log(`⚠️ No levels found for category: ${categoryId}`, levelError.message);
        levels = [];
      }
      
      categories.push({
        id: categoryId,
        category_name: categoryData.category_name || categoryData.name || categoryId,
        language: categoryData.language || '',
        status: categoryData.status || 'active',
        levels: levels,
        created_at: categoryData.created_at || null,
        created_by: categoryData.created_by || null,
        isModernSchema: categoryData.isModernSchema || false,
        ...categoryData
      });
    }
    
    console.log(`✅ Returning ${categories.length} categories with levels`);
    
    return res.status(200).json({
      success: true,
      schema: categories
    });
    
  } catch (error) {
    console.error('❌ Get Active Schema Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active exam schema.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 3. Get Specific Category with Levels - FIXED
// =========================================================================
const getCategoryWithLevels = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    console.log(`🔍 Fetching category: ${categoryId}`);
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }
    
    const categoryData = categoryDoc.data();
    
    // Get levels - NO WHERE CLAUSE
    let levels = [];
    try {
      const levelsSnapshot = await db.collection('exam_categories')
        .doc(categoryId)
        .collection('levels')
        .get(); // 👈 Get ALL levels
      
      console.log(`📂 Found ${levelsSnapshot.size} levels for ${categoryId}`);
      
      levels = levelsSnapshot.docs.map(levelDoc => {
        const levelData = levelDoc.data();
        return {
          id: levelDoc.id,
          level_name: levelData.level_name || levelData.name || levelDoc.id,
          status: levelData.status || levelData.is_active === 1 ? 'active' : 'inactive',
          credit_cost: levelData.credit_cost || 0,
          isCreditSet: levelData.isCreditSet || false,
          ...levelData
        };
      });
      
      // Sort levels
      levels.sort((a, b) => {
        if (a.credit_cost !== b.credit_cost) {
          return (a.credit_cost || 0) - (b.credit_cost || 0);
        }
        return (a.level_name || '').localeCompare(b.level_name || '');
      });
      
    } catch (levelError) {
      console.log(`⚠️ No levels found for category: ${categoryId}`);
      levels = [];
    }
    
    return res.status(200).json({
      success: true,
      category: {
        id: categoryId,
        ...categoryData,
        levels: levels
      }
    });
    
  } catch (error) {
    console.error('❌ Get Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 4. Get Full Language Cluster Schema (Admin Only)
// =========================================================================
const getLanguageClusterSchema = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    
    const categories = [];
    
    for (const doc of snapshot.docs) {
      const categoryData = doc.data();
      const categoryId = doc.id;
      
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories')
          .doc(categoryId)
          .collection('levels')
          .get();
        
        levels = levelsSnapshot.docs.map(levelDoc => ({
          id: levelDoc.id,
          ...levelDoc.data()
        }));
      } catch (levelError) {
        levels = [];
      }
      
      categories.push({
        id: categoryId,
        ...categoryData,
        levels: levels
      });
    }
    
    return res.status(200).json({
      success: true,
      schema: categories
    });
  } catch (error) {
    console.error('Get Language Schema Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch language schema.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 5. Add New Category
// =========================================================================
const addCategory = async (req, res) => {
  try {
    const { category_name, language, description, status } = req.body;
    
    if (!category_name || !language) {
      return res.status(400).json({
        success: false,
        message: 'Category name and language are required.'
      });
    }
    
    const categoryId = category_name.toLowerCase().replace(/\s+/g, '-');
    
    const categoryData = {
      category_name,
      language,
      description: description || '',
      status: status || 'active',
      created_at: new Date().toISOString(),
      created_by: req.user?.email || 'admin',
      isModernSchema: true
    };
    
    await db.collection('exam_categories').doc(categoryId).set(categoryData);
    
    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      categoryId
    });
  } catch (error) {
    console.error('Add Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 6. Add Level to Category
// =========================================================================
const addLevelToCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { level_name, description, status, credit_cost, isCreditSet } = req.body;
    
    if (!level_name) {
      return res.status(400).json({
        success: false,
        message: 'Level name is required.'
      });
    }
    
    const levelId = level_name.toLowerCase().replace(/\s+/g, '-');
    
    const levelData = {
      level_name,
      description: description || '',
      status: status || 'active',
      is_active: status === 'active' ? 1 : 0,
      credit_cost: credit_cost || 0,
      isCreditSet: isCreditSet || false,
      created_at: new Date().toISOString(),
      created_by: req.user?.email || 'admin'
    };
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .doc(levelId)
      .set(levelData);
    
    return res.status(201).json({
      success: true,
      message: 'Level added successfully.',
      levelId
    });
  } catch (error) {
    console.error('Add Level Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add level.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 7. Update Category Status
// =========================================================================
const updateCategoryStatus = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or archived.'
      });
    }
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .update({
        status,
        updated_at: new Date().toISOString()
      });
    
    return res.status(200).json({
      success: true,
      message: 'Category status updated successfully.'
    });
  } catch (error) {
    console.error('Update Category Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 8. Delete Category (Archive)
// =========================================================================
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      });
    
    return res.status(200).json({
      success: true,
      message: 'Category archived successfully.'
    });
  } catch (error) {
    console.error('Delete Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive category.',
      error: error.message
    });
  }
};

module.exports = {
  getActiveLanguages,
  getActiveSchemaForSystem,
  getLanguageClusterSchema,
  addCategory,
  addLevelToCategory,
  updateCategoryStatus,
  deleteCategory,
  getCategoryWithLevels
};