// backend/services/auditLogService.js
const { db } = require('../config/firebase');

// ============================================
// 📌 AUDIT LOG TYPES
// ============================================
// 1. user_lifecycle    - User registration, suspension, activation, deletion
// 2. privilege_change  - Role & permission changes
// 3. authentication    - Login, logout, failed attempts
// 4. content_moderation - Exam CRUD, approval, rejection
// 5. financial         - Purchases, payouts, subscriptions
// 6. system_config     - Settings, banners, commission updates
// 7. exam_attempt      - Exam start, submit, violations
// 8. tutor_validation  - Tutor approve/reject
// 9. language_management - Categories & Levels CRUD

// ============================================
// ✅ EXISTING METHODS (Keep as is)
// ============================================
const logPrivilegeChange = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail, role,
      action, changes, reason = '',
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail, role,
      action, changes, reason, ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'privilege_change'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log privilege change:', error);
    return { success: false, error: error.message };
  }
};

const logUserLifecycle = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, reason = '',
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, reason, ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'user_lifecycle'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log user lifecycle:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🆕 NEW METHODS TO ADD
// ============================================

// 1️⃣ AUTHENTICATION LOGS
const logAuthentication = async (data) => {
  try {
    const {
      userId, userEmail, action, role,
      ip = 'unknown', userAgent = 'unknown',
      success = true, error = null
    } = data;

    const logEntry = {
      userId, userEmail, action, role,
      ip, userAgent, success, error,
      timestamp: new Date().toISOString(),
      type: 'authentication'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log authentication:', error);
    return { success: false, error: error.message };
  }
};

// 2️⃣ CONTENT MODERATION LOGS
const logContentModeration = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      changes = {}, reason = '', feedback = '',
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      changes, reason, feedback,
      ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'content_moderation'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log content moderation:', error);
    return { success: false, error: error.message };
  }
};

// 3️⃣ FINANCIAL LOGS
const logFinancial = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId,
      amount = 0, credits = 0, status,
      paymentMethod = '', changes = {},
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId,
      amount, credits, status, paymentMethod, changes,
      ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'financial'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log financial event:', error);
    return { success: false, error: error.message };
  }
};

// 4️⃣ SYSTEM CONFIG LOGS
const logSystemConfig = async (data) => {
  try {
    const {
      actorId, actorEmail, action, settingType,
      changes = {},
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      actorId, actorEmail, action, settingType,
      changes, ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'system_config'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log system config:', error);
    return { success: false, error: error.message };
  }
};

// 5️⃣ EXAM ATTEMPT LOGS
const logExamAttempt = async (data) => {
  try {
    const {
      studentId, studentEmail, examId, examTitle, attemptId,
      action, score = null, questions = 0, correct = 0,
      violationType = null,
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      studentId, studentEmail, examId, examTitle, attemptId,
      action, score, questions, correct, violationType,
      ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'exam_attempt'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log exam attempt:', error);
    return { success: false, error: error.message };
  }
};

// 6️⃣ TUTOR VALIDATION LOGS
const logTutorValidation = async (data) => {
  try {
    const {
      tutorId, tutorEmail, validatorId, validatorEmail,
      action, reason = '', feedback = '',
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      tutorId, tutorEmail, validatorId, validatorEmail,
      action, reason, feedback,
      ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'tutor_validation'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log tutor validation:', error);
    return { success: false, error: error.message };
  }
};

// 7️⃣ LANGUAGE MANAGEMENT LOGS
const logLanguageManagement = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      changes = {},
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      changes, ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'language_management'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log language management:', error);
    return { success: false, error: error.message };
  }
};

// 8️⃣ CREDIT MANAGEMENT LOGS
const logCreditManagement = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      previousCredits = 0, newCredits = 0,
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, entityType, entityId, entityName,
      previousCredits, newCredits,
      ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'credit_management'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log credit management:', error);
    return { success: false, error: error.message };
  }
};

// 9️⃣ PLAN MANAGEMENT LOGS
const logPlanManagement = async (data) => {
  try {
    const {
      userId, userEmail, actorId, actorEmail,
      action, entityId, entityName,
      changes = {},
      ip = 'unknown', userAgent = 'unknown'
    } = data;

    const logEntry = {
      userId, userEmail, actorId, actorEmail,
      action, entityId, entityName,
      changes, ip, userAgent,
      timestamp: new Date().toISOString(),
      type: 'plan_management'
    };

    const docRef = await db.collection('audit_logs').add(logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to log plan management:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 🔍 GET AUDIT LOGS (Enhanced)
// ============================================
const getAuditLogs = async (filters = {}) => {
  try {
    let query = db.collection('audit_logs').orderBy('timestamp', 'desc');

    // Apply filters
    const filterMap = {
      userId: 'userId',
      actorId: 'actorId',
      type: 'type',
      action: 'action',
      entityType: 'entityType',
      entityId: 'entityId'
    };

    Object.keys(filterMap).forEach(key => {
      if (filters[key]) {
        query = query.where(filterMap[key], '==', filters[key]);
      }
    });

    // Date range filters
    if (filters.dateFrom) {
      query = query.where('timestamp', '>=', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.where('timestamp', '<=', filters.dateTo);
    }

    // Search by email or name (client-side filtering for complex queries)
    const limit = filters.limit || 100;
    query = query.limit(limit);

    const snapshot = await query.get();
    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    // If search term provided, filter client-side for email matches
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return {
        success: true,
        logs: logs.filter(log =>
          (log.userEmail || '').toLowerCase().includes(searchLower) ||
          (log.actorEmail || '').toLowerCase().includes(searchLower) ||
          (log.entityName || '').toLowerCase().includes(searchLower) ||
          (log.reason || '').toLowerCase().includes(searchLower)
        )
      };
    }

    return { success: true, logs };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { success: false, error: error.message, logs: [] };
  }
};

// ============================================
// 📊 GET AUDIT STATS (Enhanced)
// ============================================
const getAuditStats = async () => {
  try {
    const snapshot = await db.collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Type breakdown
    const byType = {};
    const byAction = {};
    const byEntityType = {};
    const dailyActivity = {};

    logs.forEach(log => {
      const type = log.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      const action = log.action || 'unknown';
      byAction[action] = (byAction[action] || 0) + 1;

      if (log.entityType) {
        byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      }

      // Daily activity
      const date = log.timestamp?.split('T')[0] || 'unknown';
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    // Get sorted daily activity (last 30 days)
    const sortedDates = Object.keys(dailyActivity).sort();
    const last30Days = sortedDates.slice(-30).map(date => ({
      date,
      count: dailyActivity[date]
    }));

    return {
      success: true,
      stats: {
        total: logs.length,
        today: logs.filter(l => l.timestamp?.startsWith(today)).length,
        thisWeek: logs.filter(l => l.timestamp >= weekAgo).length,
        thisMonth: logs.filter(l => l.timestamp >= monthAgo).length,
        byType,
        byAction,
        byEntityType,
        dailyActivity: last30Days,
        uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
        uniqueActors: new Set(logs.map(l => l.actorId).filter(Boolean)).size,
        topUsers: getTopUsers(logs),
        recentFailures: logs.filter(l => l.success === false).slice(0, 10)
      }
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return { success: false, error: error.message };
  }
};

// Helper: Get top users by activity
const getTopUsers = (logs) => {
  const userActivity = {};
  logs.forEach(log => {
    const email = log.userEmail || log.actorEmail || 'unknown';
    userActivity[email] = (userActivity[email] || 0) + 1;
  });
  return Object.entries(userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }));
};

// ============================================
// 📤 EXPORT ALL METHODS
// ============================================
module.exports = {
  // ✅ Existing
  logPrivilegeChange,
  logUserLifecycle,
  
  // 🆕 New
  logAuthentication,
  logContentModeration,
  logFinancial,
  logSystemConfig,
  logExamAttempt,
  logTutorValidation,
  logLanguageManagement,
  logCreditManagement,
  logPlanManagement,
  
  // 🔍 Queries
  getAuditLogs,
  getAuditStats
};