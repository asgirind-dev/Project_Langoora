// backend/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { protect, requirePermission, authorizeRoles } = require('../middleware/authMiddleware');
const auditLogService = require('../services/auditLogService');

// All audit routes require authentication
router.use(protect);

// ✅ Get audit logs with filters
router.get('/logs', async (req, res) => {
  try {
    const user = req.user;
    const userRole = user?.role;
    const permissions = user?.permissions || {};
    
    // Check if user has permission OR is super_admin/admin
    const hasPermission = permissions.view_audit_logs === true;
    const isAuthorized = hasPermission || 
                        userRole === 'super_admin' || 
                        userRole === 'admin' ||
                        userRole === 'validator';
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view audit logs.',
      });
    }

    const {
      userId, actorId, type, action,
      entityType, entityId,
      dateFrom, dateTo,
      search, limit
    } = req.query;

    const result = await auditLogService.getAuditLogs({
      userId, actorId, type, action,
      entityType, entityId,
      dateFrom, dateTo,
      search,
      limit: limit ? parseInt(limit) : 100
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        logs: result.logs,
        count: result.logs.length
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// ✅ Get audit stats
router.get('/stats', async (req, res) => {
  try {
    const user = req.user;
    const userRole = user?.role;
    const permissions = user?.permissions || {};
    
    const hasPermission = permissions.view_audit_logs === true;
    const isAuthorized = hasPermission || 
                        userRole === 'super_admin' || 
                        userRole === 'admin' ||
                        userRole === 'validator';
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view audit logs.',
      });
    }
    
    const result = await auditLogService.getAuditStats();
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        stats: result.stats
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit stats'
    });
  }
});

// ✅ Get audit log types (for filter dropdowns)
router.get('/types', async (req, res) => {
  try {
    const types = [
      { value: 'user_lifecycle', label: 'User Lifecycle' },
      { value: 'privilege_change', label: 'Privilege Changes' },
      { value: 'authentication', label: 'Authentication' },
      { value: 'content_moderation', label: 'Content Moderation' },
      { value: 'financial', label: 'Financial' },
      { value: 'system_config', label: 'System Config' },
      { value: 'exam_attempt', label: 'Exam Attempts' },
      { value: 'tutor_validation', label: 'Tutor Validation' },
      { value: 'language_management', label: 'Language Management' },
      { value: 'credit_management', label: 'Credit Management' },
      { value: 'plan_management', label: 'Plan Management' }
    ];
    
    res.status(200).json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;