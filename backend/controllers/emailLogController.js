// backend/controllers/emailLogController.js
const emailLogService = require('../services/emailLogService');
const emailRateLimitService = require('../services/emailRateLimitService');

class EmailLogController {
  /**
   * Get email logs
   */
  async getLogs(req, res) {
    try {
      const { limit = 50, startAfter } = req.query;
      const result = await emailLogService.getLogs(parseInt(limit), startAfter);
      
      if (result.success) {
        res.status(200).json({ success: true, logs: result.logs });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get email analytics
   */
  async getAnalytics(req, res) {
    try {
      const { timeRange = 'day' } = req.query;
      const result = await emailLogService.getAnalytics(timeRange);
      
      if (result.success) {
        res.status(200).json({ success: true, stats: result.stats });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(req, res) {
    try {
      const status = await emailRateLimitService.getStatus();
      res.status(200).json({ success: true, status });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update rate limits
   */
  async updateRateLimits(req, res) {
    try {
      const { perHour, perDay, perMinute } = req.body;
      const result = await emailRateLimitService.updateRateLimits({
        perHour,
        perDay,
        perMinute
      });
      
      if (result.success) {
        res.status(200).json({ success: true, limits: result.limits });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Clean old logs
   */
  async cleanLogs(req, res) {
    try {
      const { daysToKeep = 30 } = req.body;
      const result = await emailLogService.cleanOldLogs(daysToKeep);
      
      if (result.success) {
        res.status(200).json({ success: true, deleted: result.deleted });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new EmailLogController();