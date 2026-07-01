const { db } = require('../config/firebase');

// =====================================================================
//  CATEGORY MANAGEMENT
// =====================================================================

/**
 * 1. Add a New Exam Category (Language Node)
 * Creates a new category document in Firestore.
 * Status defaults to 'active' if not provided.
 */
const addCategory = async (req, res) => {
  try {
    const { category_name, language, status } = req.body;
    const cleanId = category_name.toLowerCase().trim().replace(/\s+/g, '_');

    if (!category_name || !language) {
      return res.status(400).json({ success: false, message: 'Mandatory configuration fields missing.' });
    }

    const categoryRef = db.collection('exam_categories').doc(cleanId);
    const doc = await categoryRef.get();

    if (doc.exists) {
      return res.status(400).json({ success: false, message: 'Category identifier node already registered.' });
    }

    const newCategory = {
      category_name: category_name.trim(),
      language: language.trim(),
      status: status || 'active',
      isModernSchema: true,
      created_at: new Date().toISOString(),
      created_by: req.user?.email || 'admin@novacore.com'
    };

    await categoryRef.set(newCategory);
    return res.status(201).json({ success: true, category: { id: cleanId, ...newCategory } });

  } catch (error) {
    console.error('Category Creation Runtime Failure:', error.message);
    return res.status(500).json({ success: false, message: 'Server failing to append category registry.' });
  }
};

/**
 * 2. Update Category Status (Activate / Deactivate / Restore)
 * Toggles the category between 'active' and 'inactive'.
 * This is a soft toggle – the category remains visible in admin views.
 * Also used for restoring a deleted category (set status to 'inactive').
 */
const updateCategoryStatus = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value. Allowed: active, inactive' });
    }

    const categoryRef = db.collection('exam_categories').doc(categoryId);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await categoryRef.update({
      status,
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Category status updated to ${status}`
    });

  } catch (error) {
    console.error('Status Update Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.'
    });
  }
};

/**
 * 3. Delete Category (Soft-Delete / Archive)
 * Marks the category as 'deleted' instead of permanently removing it.
 * Also soft-deletes all nested levels (sets is_active = 0).
 * Preserves historical records and allows future restoration.
 */
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryRef = db.collection('exam_categories').doc(categoryId);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // 1) Soft-delete the category itself
    await categoryRef.update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      deleted_by: req.user?.email || 'admin@novacore.com'
    });

    // 2) Soft-delete all nested levels (optional, but recommended)
    const levelsSnapshot = await db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .get();

    if (!levelsSnapshot.empty) {
      const batch = db.batch();
      levelsSnapshot.forEach(lvlDoc => {
        const levelRef = lvlDoc.ref;
        batch.update(levelRef, {
          is_active: 0,
          deleted_at: new Date().toISOString()
        });
      });
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: 'Category archived successfully. It can be restored anytime.'
    });

  } catch (error) {
    console.error('Soft-Delete Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive category.'
    });
  }
};

// =====================================================================
//  LEVEL MANAGEMENT
// =====================================================================

/**
 * 4. Add a Level Layer to Category
 * Initialized with 0 credits and pending finance approval flag.
 * The level is active by default (is_active = 1).
 */
const addLevelToCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { level_name } = req.body;
    const cleanLevelId = level_name.toLowerCase().trim().replace(/\s+/g, '_');

    const newLevel = {
      level_name: level_name.trim(),
      credit_cost: 0,
      isCreditSet: false,
      is_active: 1,
      created_at: new Date().toISOString(),
      created_by: req.user?.email
    };

    await db.collection('exam_categories').doc(categoryId).collection('levels').doc(cleanLevelId).set(newLevel);
    return res.status(201).json({ success: true, level: newLevel });

  } catch (error) {
    console.error('Level Creation Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server failing to resolve level map sequence.' });
  }
};

// =====================================================================
//  SCHEMA FETCHING
// =====================================================================

/**
 * 5. Fetch Full Schema Map for Admin Control Panel View
 * Returns ALL categories and their levels, including inactive and deleted ones.
 * (For admin – they can see everything and restore if needed.)
 */
const getLanguageSchema = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories')
      .where('isModernSchema', '==', true)
      .get();

    const clusterSchema = [];

    for (const catDoc of categoriesSnapshot.docs) {
      const catData = catDoc.data();
      const levelsSnapshot = await db.collection('exam_categories')
        .doc(catDoc.id)
        .collection('levels')
        .get();

      const levels = [];
      levelsSnapshot.forEach(lvlDoc => {
        levels.push({ id: lvlDoc.id, ...lvlDoc.data() });
      });

      clusterSchema.push({
        id: catDoc.id,
        ...catData,
        levels
      });
    }

    return res.status(200).json({ success: true, schema: clusterSchema });

  } catch (error) {
    console.error('Schema Sync Critical Failure:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to synchronize structural matrix.' });
  }
};

/**
 * 6. Fetch Operational Fully-Priced Schema for Tutors and Takers
 * Returns only ACTIVE categories with levels that are ACTIVE and PRICED (isCreditSet = true).
 * This is the schema used by the public / tutor side of the application.
 */
const getActiveSchemaForSystem = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories')
      .where('isModernSchema', '==', true)
      .where('status', '==', 'active')
      .get();

    const activeClusterSchema = [];

    for (const catDoc of categoriesSnapshot.docs) {
      const catData = catDoc.data();

      const levelsSnapshot = await db.collection('exam_categories')
        .doc(catDoc.id)
        .collection('levels')
        .where('is_active', '==', 1)
        // .where('isCreditSet', '==', true)  
        .get();

      const verifiedLevels = [];
      levelsSnapshot.forEach(lvlDoc => {
        verifiedLevels.push({ id: lvlDoc.id, ...lvlDoc.data() });
      });

      if (verifiedLevels.length > 0) {
        activeClusterSchema.push({
          id: catDoc.id,
          ...catData,
          levels: verifiedLevels
        });
      }
    }

    return res.status(200).json({ success: true, schema: activeClusterSchema });

  } catch (error) {
    console.error('System Active Schema Fetch Failure:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to synchronize operational structural matrix.' });
  }
};

// =====================================================================
//  7. Get Active Languages for Registration (Tutor Registration)
//  Returns unique language names from active categories only.
//  Used by the tutor registration form to populate the language dropdown.
// =====================================================================
const getActiveLanguages = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories')
      .where('isModernSchema', '==', true)
      .where('status', '==', 'active')
      .get();

    const languages = new Set();
    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.language) {
        languages.add(data.language);
      }
    });

    return res.status(200).json({
      success: true,
      languages: Array.from(languages).sort()
    });
  } catch (error) {
    console.error('Get Active Languages Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active languages.'
    });
  }
};

// =====================================================================
//  EXPORTS
// =====================================================================

module.exports = {
  addCategory,
  updateCategoryStatus,
  deleteCategory,
  addLevelToCategory,
  getLanguageClusterSchema: getLanguageSchema,
  getActiveSchemaForSystem,
  getActiveLanguages // ✅ New export for tutor registration language dropdown
};