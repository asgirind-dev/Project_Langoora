// backend/controllers/languageController.js
const { db } = require('../config/firebase');

// ✅ ADD: Audit Log Service
const auditLogService = require('../services/auditLogService');

// ✅ ADD: Notification Service
const notificationService = require('../services/NotificationService');

// ✅ ADD: Email Service
const emailService = require('../services/emailService');

// ✅ Helper for non-blocking audit logging
const logAudit = (fn, data) => {
  fn(data).catch(err => console.error('Audit log error:', err));
};

// ✅ Helper for non-blocking notification sending
const sendNotification = async (fn, data) => {
  try {
    await fn(data);
  } catch (err) {
    console.error('Notification error:', err);
  }
};

// =========================================================================
// 📚 Helper: Get Finance Admin Emails
// =========================================================================
const getFinanceAdminEmails = async () => {
  try {
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['finance', 'finance_admin'])
      .get();
    
    const emails = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.email) {
        emails.push(userData.email);
      }
    });
    return emails;
  } catch (error) {
    console.error('Error fetching finance admin emails:', error);
    return [];
  }
};

// =========================================================================
// 📚 Helper: Get Finance Admin User IDs
// =========================================================================
const getFinanceAdminIds = async () => {
  try {
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['finance', 'finance_admin'])
      .get();
    
    const userIds = [];
    usersSnapshot.forEach(doc => {
      userIds.push(doc.id);
    });
    return userIds;
  } catch (error) {
    console.error('Error fetching finance admin IDs:', error);
    return [];
  }
};

// =========================================================================
// 📚 1. Get Active Languages (Public - No Auth) - NO AUDIT (READ ONLY)
// =========================================================================
const getActiveLanguages = async (req, res) => {
  try {
    console.log('📡 Fetching active languages...');
    
    const snapshot = await db.collection('exam_categories')
      .where('status', '==', 'active')
      .get();
    
    if (snapshot.empty) {
      console.log('⚠️ No active exam categories found');
      return res.status(200).json({
        success: true,
        languages: []
      });
    }
    
    const languagesSet = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      
      const languageName = data.language || 
                          data.name || 
                          data.category_name || 
                          data.title || 
                          docId;
      
      if (languageName && typeof languageName === 'string') {
        const trimmed = languageName.trim();
        if (trimmed !== '') {
          languagesSet.add(trimmed);
        }
      }
    });
    
    const languages = Array.from(languagesSet).sort();
    
    console.log(`✅ Found ${languages.length} active languages:`, languages);
    
    return res.status(200).json({
      success: true,
      languages: languages
    });
    
  } catch (error) {
    console.error('❌ Get Active Languages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active languages.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 2. Get Active Schema (NO AUDIT - READ ONLY)
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
      
      const categoryPassingScore = categoryData.passing_score || 65;
      
      let levels = [];
      try {
        const levelsSnapshot = await db.collection('exam_categories')
          .doc(categoryId)
          .collection('levels')
          .get();
        
        console.log(`📂 Found ${levelsSnapshot.size} levels for ${categoryId}`);
        
        levels = levelsSnapshot.docs.map(levelDoc => {
          const levelData = levelDoc.data();
          return {
            id: levelDoc.id,
            level_name: levelData.level_name || levelData.name || levelDoc.id,
            status: levelData.status || levelData.is_active === 1 ? 'active' : 'inactive',
            credit_cost: levelData.credit_cost || 0,
            isCreditSet: levelData.isCreditSet || false,
            passing_score: levelData.passing_score || categoryPassingScore,
            passing_type: levelData.passing_type || categoryData.passing_type || null,
            passing_config: levelData.passing_config || categoryData.passing_config || null,
            scoring_method: levelData.scoring_method || categoryData.scoring_method || null,
            scoring_config: levelData.scoring_config || categoryData.scoring_config || null,
            ...levelData
          };
        });
        
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
        passing_score: categoryPassingScore,
        passing_type: categoryData.passing_type || null,
        passing_config: categoryData.passing_config || null,
        scoring_method: categoryData.scoring_method || null,
        scoring_config: categoryData.scoring_config || null,
        hasLevels: levels.length > 0,
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
// 📚 3. Get Full Language Cluster Schema (NO AUDIT - READ ONLY)
// =========================================================================
const getLanguageClusterSchema = async (req, res) => {
  try {
    console.log('📚 Fetching full language cluster schema...');
    
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
    
    console.log(`✅ Returning ${categories.length} categories`);
    
    return res.status(200).json({
      success: true,
      schema: categories
    });
    
  } catch (error) {
    console.error('❌ Get Language Schema Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch language schema.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 4. Add New Category - WITH AUDIT LOG & NOTIFICATIONS
// =========================================================================
const addCategory = async (req, res) => {
  try {
    const { 
      category_name, 
      language, 
      description, 
      status,
      passing_score,
      passing_type,
      passing_config,
      scoring_method,
      scoring_config
    } = req.body;
    
    if (!category_name || !language) {
      return res.status(400).json({
        success: false,
        message: 'Category name and language are required.'
      });
    }
    
    const categoryId = category_name.toLowerCase().replace(/\s+/g, '-');
    
    const existingDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (existingDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists.'
      });
    }
    
    const categoryData = {
      category_name,
      language,
      description: description || '',
      status: status || 'active',
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
    
    console.log(`✅ Category created: ${categoryId}`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - CATEGORY CREATED
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

    // ✅ NOTIFICATION: Send to Finance Admins
    try {
      const financeAdminIds = await getFinanceAdminIds();
      if (financeAdminIds.length > 0) {
        await sendNotification(notificationService.sendToMany, [
          financeAdminIds,
          {
            type: 'category_created',
            title: '📚 New Exam Category Created',
            message: `A new exam category "${category_name}" (${language}) has been created by ${req.user?.email || 'Admin'}. Please review and configure credit values.`,
            actionUrl: '/finance-admin/exam-credits',
            categoryId: categoryId,
            categoryName: category_name,
            language: language
          }
        ]);
        console.log(`✅ Notifications sent to ${financeAdminIds.length} finance admins`);
      }
    } catch (notifError) {
      console.error('❌ Failed to send notifications:', notifError);
    }

    // ✅ EMAIL: Send to Finance Admins
    try {
      const financeEmails = await getFinanceAdminEmails();
      if (financeEmails.length > 0) {
        for (const email of financeEmails) {
          await emailService.sendCategoryCreatedEmail(
            email,
            category_name,
            language,
            categoryId,
            req.user?.email || 'Admin'
          );
        }
        console.log(`✅ Emails sent to ${financeEmails.length} finance admins`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send emails:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Category created successfully. Finance Admin has been notified.',
      categoryId,
      category: {
        id: categoryId,
        ...categoryData
      }
    });
    
  } catch (error) {
    console.error('❌ Add Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 5. Update Category - WITH AUDIT LOG
// =========================================================================
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { 
      category_name, 
      language, 
      description, 
      status,
      passing_score,
      passing_type,
      passing_config,
      scoring_method,
      scoring_config
    } = req.body;
    
    console.log('📝 Updating category:', categoryId);
    console.log('📝 Received data:', { passing_type, passing_config, passing_score, scoring_method, scoring_config });
    
    const categoryRef = db.collection('exam_categories').doc(categoryId);
    const categoryDoc = await categoryRef.get();
    
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const oldData = categoryDoc.data();
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (category_name !== undefined) updateData.category_name = category_name;
    if (language !== undefined) updateData.language = language;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (passing_score !== undefined) updateData.passing_score = passing_score;
    
    if (passing_type !== undefined) {
      updateData.passing_type = passing_type;
      console.log('✅ Adding passing_type:', passing_type);
    }
    if (passing_config !== undefined) {
      updateData.passing_config = passing_config;
      console.log('✅ Adding passing_config:', passing_config);
    }
    if (scoring_method !== undefined) {
      updateData.scoring_method = scoring_method;
      console.log('✅ Adding scoring_method:', scoring_method);
    }
    if (scoring_config !== undefined) {
      updateData.scoring_config = scoring_config;
      console.log('✅ Adding scoring_config:', scoring_config);
    }
    
    console.log('📝 Final update data:', JSON.stringify(updateData, null, 2));
    
    await categoryRef.update(updateData);
    
    const updatedDoc = await categoryRef.get();

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - CATEGORY UPDATED
    const changes = {};
    const fieldsToTrack = ['category_name', 'language', 'description', 'status', 'passing_score', 'passing_type', 'passing_config', 'scoring_method', 'scoring_config'];
    fieldsToTrack.forEach(field => {
      const oldVal = oldData[field];
      const newVal = req.body[field];
      if (oldVal !== newVal && newVal !== undefined) {
        changes[field] = { old: oldVal, new: newVal };
      }
    });

    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'category',
      entityId: categoryId,
      entityName: category_name || oldData.category_name || categoryId,
      changes: changes,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category: {
        id: categoryId,
        ...updatedDoc.data()
      }
    });
    
  } catch (error) {
    console.error('❌ Update Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 6. Add Level to Category - WITH AUDIT LOG & NOTIFICATIONS
// ✅ FIXED: Admin cannot set credit_cost or isCreditSet
// ✅ FIXED: Default values are 0 and false (pending Finance approval)
// ✅ NEW: Supports scoring_method and scoring_config
// ✅ NEW: Sends notifications and emails to Finance Admin
// =========================================================================
const addLevelToCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { 
      level_name, 
      description, 
      status, 
      // ❌ REMOVED: credit_cost, isCreditSet - Admin cannot set these
      passing_score,
      passing_type,
      passing_config,
      scoring_method,
      scoring_config
    } = req.body;
    
    if (!level_name) {
      return res.status(400).json({
        success: false,
        message: 'Level name is required.'
      });
    }
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }
    
    const categoryData = categoryDoc.data();
    const categoryPassingScore = categoryData.passing_score || 65;
    const categoryName = categoryData.category_name || categoryId;
    
    const levelId = level_name.toLowerCase().replace(/\s+/g, '-');
    
    // ✅ FIXED: Always set credit_cost to 0 and isCreditSet to false
    // Finance Admin will set these values later via ExamCreditValuation
    const levelData = {
      level_name,
      description: description || '',
      status: status || 'active',
      is_active: status === 'active' ? 1 : 0,
      credit_cost: 0,
      isCreditSet: false,
      passing_score: passing_score || categoryPassingScore,
      passing_type: passing_type || null,
      passing_config: passing_config || null,
      scoring_method: scoring_method || null,
      scoring_config: scoring_config || null,
      created_at: new Date().toISOString(),
      created_by: req.user?.email || req.user?.uid || 'admin',
      updated_at: new Date().toISOString()
    };
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .doc(levelId)
      .set(levelData);
    
    console.log(`✅ Level created: ${levelId} in category: ${categoryId}`);
    console.log(`⏳ Credit valuation pending for level: ${level_name}`);
    console.log(`📊 Scoring method: ${levelData.scoring_method || 'Inherited from category'}`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - LEVEL CREATED
    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'created',
      entityType: 'level',
      entityId: levelId,
      entityName: level_name,
      changes: { 
        categoryId, 
        ...levelData,
        credit_status: 'pending_finance_approval'
      },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // ✅ NOTIFICATION: Send to Finance Admins
    try {
      const financeAdminIds = await getFinanceAdminIds();
      if (financeAdminIds.length > 0) {
        await sendNotification(notificationService.sendToMany, [
          financeAdminIds,
          {
            type: 'level_created',
            title: '📝 New Exam Level Created',
            message: `A new level "${level_name}" has been added to category "${categoryName}" by ${req.user?.email || 'Admin'}. Credit valuation is pending.`,
            actionUrl: '/finance-admin/exam-credits',
            categoryId: categoryId,
            categoryName: categoryName,
            levelId: levelId,
            levelName: level_name
          }
        ]);
        console.log(`✅ Notifications sent to ${financeAdminIds.length} finance admins`);
      }
    } catch (notifError) {
      console.error('❌ Failed to send notifications:', notifError);
    }

    // ✅ EMAIL: Send to Finance Admins
    try {
      const financeEmails = await getFinanceAdminEmails();
      if (financeEmails.length > 0) {
        for (const email of financeEmails) {
          await emailService.sendLevelCreatedEmail(
            email,
            level_name,
            categoryName,
            categoryId,
            levelId,
            req.user?.email || 'Admin'
          );
        }
        console.log(`✅ Emails sent to ${financeEmails.length} finance admins`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send emails:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Level added successfully. Credit valuation pending from Finance Admin. Finance Admin has been notified.',
      levelId,
      level: {
        id: levelId,
        ...levelData
      }
    });
    
  } catch (error) {
    console.error('❌ Add Level Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add level.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 7. Update Level - WITH AUDIT LOG
// ✅ NEW: Supports scoring_method and scoring_config
// =========================================================================
const updateLevel = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { 
      level_name, 
      description, 
      status, 
      credit_cost, 
      isCreditSet,
      passing_score,
      passing_type,
      passing_config,
      scoring_method,
      scoring_config
    } = req.body;
    
    console.log('📝 Updating level:', levelId, 'in category:', categoryId);
    console.log('📝 Received data:', { passing_type, passing_config, passing_score, credit_cost, isCreditSet, scoring_method, scoring_config });
    
    const levelRef = db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .doc(levelId);
    
    const levelDoc = await levelRef.get();
    if (!levelDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Level not found.'
      });
    }

    const oldData = levelDoc.data();
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (level_name !== undefined) updateData.level_name = level_name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      updateData.is_active = status === 'active' ? 1 : 0;
    }
    if (credit_cost !== undefined) updateData.credit_cost = credit_cost;
    if (isCreditSet !== undefined) updateData.isCreditSet = isCreditSet;
    if (passing_score !== undefined) updateData.passing_score = passing_score;
    
    if (passing_type !== undefined) {
      updateData.passing_type = passing_type;
      console.log('✅ Adding passing_type:', passing_type);
    }
    if (passing_config !== undefined) {
      updateData.passing_config = passing_config;
      console.log('✅ Adding passing_config:', JSON.stringify(passing_config, null, 2));
    }
    if (scoring_method !== undefined) {
      updateData.scoring_method = scoring_method;
      console.log('✅ Adding scoring_method:', scoring_method);
    }
    if (scoring_config !== undefined) {
      updateData.scoring_config = scoring_config;
      console.log('✅ Adding scoring_config:', JSON.stringify(scoring_config, null, 2));
    }
    
    console.log('📝 Final update data:', JSON.stringify(updateData, null, 2));
    
    await levelRef.update(updateData);
    
    const updatedDoc = await levelRef.get();
    const updatedData = updatedDoc.data();
    
    console.log('📝 Updated level data from Firestore:', JSON.stringify(updatedData, null, 2));

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - LEVEL UPDATED
    const changes = {};
    const fieldsToTrack = ['level_name', 'description', 'status', 'credit_cost', 'isCreditSet', 'passing_score', 'passing_type', 'passing_config', 'scoring_method', 'scoring_config'];
    fieldsToTrack.forEach(field => {
      const oldVal = oldData[field];
      const newVal = req.body[field];
      if (oldVal !== newVal && newVal !== undefined) {
        changes[field] = { old: oldVal, new: newVal };
      }
    });

    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'level',
      entityId: levelId,
      entityName: level_name || oldData.level_name || levelId,
      changes: changes,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Level updated successfully.',
      level: {
        id: levelId,
        ...updatedData
      }
    });
    
  } catch (error) {
    console.error('❌ Update Level Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update level.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 8. Update Category Status - WITH AUDIT LOG
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
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const oldStatus = categoryDoc.data().status || 'active';
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .update({
        status,
        updated_at: new Date().toISOString()
      });
    
    console.log(`✅ Category ${categoryId} status updated to: ${status}`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - CATEGORY STATUS UPDATED
    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'category_status',
      entityId: categoryId,
      entityName: categoryDoc.data().category_name || categoryId,
      changes: { status: { old: oldStatus, new: status } },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Category status updated successfully.',
      status
    });
    
  } catch (error) {
    console.error('❌ Update Category Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 9. Delete Category (Archive) - WITH AUDIT LOG
// =========================================================================
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const categoryData = categoryDoc.data();
    
    await db.collection('exam_categories')
      .doc(categoryId)
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      });
    
    console.log(`✅ Category ${categoryId} archived`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - CATEGORY ARCHIVED
    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'deleted',
      entityType: 'category',
      entityId: categoryId,
      entityName: categoryData.category_name || categoryId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Category archived successfully.'
    });
    
  } catch (error) {
    console.error('❌ Delete Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 10. Hard Delete Category - WITH AUDIT LOG
// =========================================================================
const hardDeleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const categoryData = categoryDoc.data();
    
    const levelsSnapshot = await db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .get();
    
    const batch = db.batch();
    const levelNames = [];
    levelsSnapshot.forEach(doc => {
      const levelData = doc.data();
      levelNames.push(levelData.level_name || levelData.name || doc.id);
      batch.delete(doc.ref);
    });
    
    batch.delete(db.collection('exam_categories').doc(categoryId));
    
    await batch.commit();
    
    console.log(`🗑️ Category ${categoryId} and all levels hard deleted`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - CATEGORY HARD DELETED
    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'deleted',
      entityType: 'category',
      entityId: categoryId,
      entityName: categoryData.category_name || categoryId,
      changes: { levels_deleted: levelNames, hard_delete: true },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Category and all levels permanently deleted.'
    });
    
  } catch (error) {
    console.error('❌ Hard Delete Category Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 11. Update Level Status - WITH AUDIT LOG
// =========================================================================
const updateLevelStatus = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive.'
      });
    }
    
    const levelRef = db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .doc(levelId);
    
    const levelDoc = await levelRef.get();
    if (!levelDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Level not found.'
      });
    }

    const oldStatus = levelDoc.data().status || 'active';
    const levelName = levelDoc.data().level_name || levelId;
    
    await levelRef.update({
      status,
      is_active: status === 'active' ? 1 : 0,
      updated_at: new Date().toISOString()
    });
    
    console.log(`✅ Level ${levelId} in category ${categoryId} updated to: ${status}`);

    // ✅ LANGUAGE MANAGEMENT AUDIT LOG - LEVEL STATUS UPDATED
    logAudit(auditLogService.logLanguageManagement, {
      userId: req.user?.uid || 'system',
      userEmail: req.user?.email || 'system@langoora.com',
      actorId: req.user?.uid || 'system',
      actorEmail: req.user?.email || 'system@langoora.com',
      action: 'updated',
      entityType: 'level_status',
      entityId: levelId,
      entityName: levelName,
      changes: { status: { old: oldStatus, new: status } },
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Level status updated successfully.',
      status
    });
    
  } catch (error) {
    console.error('❌ Update Level Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update level status.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 12. Get All Categories (NO AUDIT - READ ONLY)
// =========================================================================
const getAllCategories = async (req, res) => {
  try {
    const snapshot = await db.collection('exam_categories').get();
    
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({
      success: true,
      categories
    });
    
  } catch (error) {
    console.error('❌ Get All Categories Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 13. Get Category by ID (NO AUDIT - READ ONLY)
// =========================================================================
const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const categoryDoc = await db.collection('exam_categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }
    
    const categoryData = categoryDoc.data();
    
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
// 📚 14. Get Level by ID (NO AUDIT - READ ONLY)
// =========================================================================
const getLevelById = async (req, res) => {
  try {
    const { categoryId, levelId } = req.params;
    
    const levelRef = db.collection('exam_categories')
      .doc(categoryId)
      .collection('levels')
      .doc(levelId);
    
    const levelDoc = await levelRef.get();
    if (!levelDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Level not found.'
      });
    }
    
    return res.status(200).json({
      success: true,
      level: {
        id: levelDoc.id,
        ...levelDoc.data()
      }
    });
    
  } catch (error) {
    console.error('❌ Get Level Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch level.',
      error: error.message
    });
  }
};

// =========================================================================
// 📚 EXPORTS
// =========================================================================
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