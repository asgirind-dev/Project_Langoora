const { db } = require('../config/firebase');

// ✅ Services Import
const auditLogService = require('../services/auditLogService');
const notificationService = require('../services/NotificationService');
const emailService = require('../services/emailService');

// 🎯 Email Constants
const FINANCE_ADMIN_EMAIL = 'himashikashmira30@gmail.com';
const MAIN_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'asgirind186@gmail.com';

const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

const triggerNotification = async (roles, notifData) => {
  try {
    if (notificationService && typeof notificationService.sendToRole === 'function') {
      await notificationService.sendToRole(roles, notifData);
      console.log(`✅ In-App Notification triggered successfully for roles: [${roles.join(', ')}]`);
    } else {
      console.warn('⚠️ NotificationService.sendToRole method missing');
    }
  } catch (notifErr) {
    console.error('❌ In-App Notification Dispatch Error:', notifErr.message);
  }
};

// 1. Get Active Languages
const getActiveLanguages = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories')
      .where('status', '==', 'active')
      .get();
    
    if (snapshot.empty) {
      return res.status(200).json({ success: true, languages: [] });
    }
    
    const languagesSet = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      const languageName = data.language || data.name || data.category_name || data.title || doc.id;
      if (languageName && typeof languageName === 'string') {
        const trimmed = languageName.trim();
        if (trimmed !== '') languagesSet.add(trimmed);
      }
    });
    
    return res.status(200).json({ success: true, languages: Array.from(languagesSet).sort() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active languages.', error: error.message });
  }
};

// 2. Get Active Schema
const getActiveSchemaForSystem = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('exam_categories').where('status', '==', 'active').get();
    const categories = [];
    
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      const categoryId = doc.id;
      const categoryPassingScore = categoryData.passing_score || 65;
      
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories').doc(categoryId).collection('levels').get();
        levels = levelsSnapshot.docs.map(levelDoc => {
          const levelData = levelDoc.data();
          return {
            id: levelDoc.id,
            level_name: levelData.level_name || levelData.name || levelDoc.id,
            status: levelData.status || levelData.is_active === 1 ? 'active' : 'inactive',
            credit_cost: levelData.credit_cost || 0,
            isCreditSet: levelData.isCreditSet || false,
            passing_score: levelData.passing_score || categoryPassingScore,
            ...levelData
          };
        });
        levels.sort((a, b) => (a.credit_cost || 0) - (b.credit_cost || 0));
      } catch (levelError) {
        levels = [];
      }
      
      categories.push({
        id: categoryId,
        category_name: categoryData.category_name || categoryData.name || categoryId,
        hasLevels: levels.length > 0,
        levels: levels,
        ...categoryData
      });
    }
    
    return res.status(200).json({ success: true, schema: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active exam schema.', error: error.message });
  }
};

// 3. Get Language Cluster Schema
const getLanguageClusterSchema = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    const categories = [];
    
    for (const doc of snapshot.docs) {
      const categoryId = doc.id;
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories').doc(categoryId).collection('levels').get();
        levels = levelsSnapshot.docs.map(levelDoc => ({ id: levelDoc.id, ...levelDoc.data() }));
      } catch (levelError) {
        levels = [];
      }
      categories.push({ id: categoryId, ...doc.data(), levels });
    }
    return res.status(200).json({ success: true, schema: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch language schema.', error: error.message });
  }
};

// 4. Add New Category (Sends Email to Finance Admin / Himi)
const addCategory = async (req, res) => {
  try {
    const { category_name, language, description, status, passing_score, passing_type, passing_config, scoring_method, scoring_config, credit_cost } = req.body;
    
    if (!category_name || !language) {
      return res.status(400).json({ success: false, message: 'Category name and language are required.' });
    }
    
    const categoryId = category_name.toLowerCase().replace(/\s+/g, '-');
    const existingDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (existingDoc.exists) {
      return res.status(400).json({ success: false, message: 'Category already exists.' });
    }
    
    const isCreditProvided = credit_cost !== undefined && credit_cost !== null && credit_cost !== '';

    const categoryData = {
      category_name,
      language,
      description: description || '',
      status: status || 'active',
      credit_cost: isCreditProvided ? Number(credit_cost) : 0,
      isCreditSet: isCreditProvided,
      passing_score: passing_score || 65,
      passing_type: passing_type || null,
      passing_config: passing_config || null,
      scoring_method: scoring_method || null,
      scoring_config: scoring_config || null,
      created_at: new Date().toISOString(),
      created_by: req.user?.email || req.user?.uid || 'admin',
      updated_at: new Date().toISOString(),
      isModernSchema: true
    };
    
    await db.collection('exam_categories').doc(categoryId).set(categoryData);

    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'created',
      entityType: 'category',
      entityId: categoryId,
      entityName: category_name,
      changes: categoryData,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    triggerNotification(['finance', 'finance_admin', 'super_admin'], {
      type: 'category_created',
      title: '📚 New Exam Category Created',
      message: `A new exam category "${category_name}" (${language}) has been created. ${isCreditProvided ? `Credits set to ${credit_cost}` : 'Please configure credit values.'}`,
      actionUrl: '/finance-admin/exam-credits',
      categoryId: categoryId,
      categoryName: category_name
    });

    console.log(`📧 Dispatching New Category Email to Finance Admin: ${FINANCE_ADMIN_EMAIL}`);
    if (emailService && emailService.sendCategoryCreatedEmail) {
      emailService.sendCategoryCreatedEmail(
        FINANCE_ADMIN_EMAIL,
        category_name,
        language,
        categoryId,
        req.user?.email || 'Admin'
      ).catch(emailErr => console.error(`❌ Category email error:`, emailErr.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      categoryId,
      category: { id: categoryId, ...categoryData }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create category.', error: error.message });
  }
};

// 5. Update Category
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const categoryRef = db.collection('exam_categories').doc(categoryId);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const categoryName = categoryDoc.data().category_name || categoryId;
    
    if (req.body.credit_cost !== undefined) {
      req.body.isCreditSet = true;
    }

    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    await categoryRef.update(updateData);
    
    triggerNotification(['finance', 'finance_admin', 'super_admin'], {
      type: 'category_updated',
      title: '✏️ Exam Category / Credits Updated',
      message: `The exam category "${categoryName}" has been updated.${req.body.credit_cost !== undefined ? ` Credits set to: ${req.body.credit_cost}` : ''}`,
      actionUrl: '/finance-admin/exam-credits',
      categoryId: categoryId,
      categoryName: categoryName
    });

    const updatedDoc = await categoryRef.get();
    return res.status(200).json({ success: true, message: 'Category updated successfully.', category: { id: categoryId, ...updatedDoc.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update category.', error: error.message });
  }
};

// 6. Add Level to Category (Sends Email to Finance Admin / Himi)
const addLevelToCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { level_name, description, status, passing_score, passing_type, passing_config, scoring_method, scoring_config, credit_cost } = req.body;
    
    if (!level_name) {
      return res.status(400).json({ success: false, message: 'Level name is required.' });
    }
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    
    const categoryData = categoryDoc.data();
    const categoryPassingScore = categoryData.passing_score || 65;
    const categoryName = categoryData.category_name || categoryId;
    const levelId = level_name.toLowerCase().replace(/\s+/g, '-');
    
    const isCreditProvided = credit_cost !== undefined && credit_cost !== null && credit_cost !== '';

    const levelData = {
      level_name,
      description: description || '',
      status: status || 'active',
      is_active: status === 'active' ? 1 : 0,
      credit_cost: isCreditProvided ? Number(credit_cost) : 0,
      isCreditSet: isCreditProvided,
      passing_score: passing_score || categoryPassingScore,
      passing_type: passing_type || null,
      passing_config: passing_config || null,
      scoring_method: scoring_method || null,
      scoring_config: scoring_config || null,
      created_at: new Date().toISOString(),
      created_by: req.user?.email || req.user?.uid || 'admin',
      updated_at: new Date().toISOString()
    };
    
    await db.collection('exam_categories').doc(categoryId).collection('levels').doc(levelId).set(levelData);

    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'created',
      entityType: 'level',
      entityId: levelId,
      entityName: level_name,
      changes: { categoryId, ...levelData, credit_status: isCreditProvided ? 'configured' : 'pending_finance_approval' },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    triggerNotification(['finance', 'finance_admin', 'super_admin'], {
      type: 'level_created',
      title: '📝 New Exam Level Created',
      message: `A new level "${level_name}" was added to category "${categoryName}". ${isCreditProvided ? `Credits set: ${credit_cost}` : 'Credit valuation is pending.'}`,
      actionUrl: '/finance-admin/exam-credits',
      categoryId: categoryId,
      categoryName: categoryName,
      levelId: levelId,
      levelName: level_name
    });

    console.log(`📧 Dispatching New Level Email to Finance Admin: ${FINANCE_ADMIN_EMAIL}`);
    if (emailService && emailService.sendLevelCreatedEmail) {
      emailService.sendLevelCreatedEmail(
        FINANCE_ADMIN_EMAIL,
        level_name,
        categoryName,
        categoryId,
        levelId,
        req.user?.email || 'Admin'
      ).catch(emailErr => console.error(`❌ Level email error:`, emailErr.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Level added successfully.',
      levelId,
      level: { id: levelId, ...levelData }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add level.', error: error.message });
  }
};

// 7. Update Level
const updateLevel = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const levelRef = db.collection('exam_categories').doc(categoryId).collection('levels').doc(levelId);
    const levelDoc = await levelRef.get();
    
    if (!levelDoc.exists) {
      return res.status(404).json({ success: false, message: 'Level not found.' });
    }

    const levelName = levelDoc.data().level_name || levelId;

    if (req.body.credit_cost !== undefined) {
      req.body.isCreditSet = true;
      req.body.is_active = 1;
      req.body.status = 'active';
    }

    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    await levelRef.update(updateData);

    triggerNotification(['finance', 'finance_admin', 'super_admin'], {
      type: 'level_updated',
      title: '🎯 Exam Level / Credit Valuation Updated',
      message: `The exam level "${levelName}" has been updated.${req.body.credit_cost !== undefined ? ` Credits set to: ${req.body.credit_cost}` : ''}`,
      actionUrl: '/finance-admin/exam-credits',
      categoryId: categoryId,
      levelId: levelId,
      levelName: levelName
    });

    const updatedDoc = await levelRef.get();
    return res.status(200).json({ success: true, message: 'Level updated successfully.', level: { id: levelId, ...updatedDoc.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update level.', error: error.message });
  }
};

const updateCategoryStatus = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.body;
    await db.collection('exam_categories').doc(categoryId).update({ status, updated_at: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Status updated.', status });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await db.collection('exam_categories').doc(req.params.categoryId).update({ status: 'archived', updated_at: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Category archived.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const hardDeleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const levelsSnapshot = await db.collection('exam_categories').doc(categoryId).collection('levels').get();
    const batch = db.batch();
    levelsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('exam_categories').doc(categoryId));
    await batch.commit();
    return res.status(200).json({ success: true, message: 'Category permanently deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateLevelStatus = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { status } = req.body;
    await db.collection('exam_categories').doc(categoryId).collection('levels').doc(levelId).update({ status, is_active: status === 'active' ? 1 : 0, updated_at: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Level status updated.', status });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const doc = await db.collection('exam_categories').doc(req.params.categoryId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.status(200).json({ success: true, category: { id: doc.id, ...doc.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getLevelById = async (req, res) => {
  try {
    const doc = await db.collection('exam_categories').doc(req.params.categoryId).collection('levels').doc(req.params.levelId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Level not found.' });
    return res.status(200).json({ success: true, level: { id: doc.id, ...doc.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getActiveLanguages,
  getActiveSchemaForSystem,
  getLanguageClusterSchema,
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  addLevelToCategory,
  updateCategoryStatus,
  deleteCategory,
  hardDeleteCategory,
  updateLevelStatus,
  updateLevel,
  getLevelById
};