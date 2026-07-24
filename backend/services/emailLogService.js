// backend/services/emailLogService.js
const { db } = require('../config/firebase');

class EmailLogService {
  constructor() {
    this.logsCollection = 'system_settings/email_logs/entries';
  }

  /**
   * Log an email sending attempt
   */
  async logEmail(logData) {
    try {
      const logEntry = {
        recipient: logData.recipient || '',
        type: logData.type || 'unknown', // 'tutor_approval', 'tutor_rejection', 'test', 'bulk'
        status: logData.status || 'sent', // 'sent', 'failed', 'bounced', 'opened'
        subject: logData.subject || '',
        senderEmail: logData.senderEmail || '',
        senderName: logData.senderName || '',
        sentAt: new Date().toISOString(),
        messageId: logData.messageId || null,
        error: logData.error || null,
        metadata: logData.metadata || {}
      };

      const docRef = await db.collection('system_settings')
        .doc('email_logs')
        .collection('entries')
        .add(logEntry);

      console.log(`✅ Email logged: ${logEntry.type} to ${logEntry.recipient}`);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Email log error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent email logs with pagination
   */
  async getLogs(limit = 50, startAfter = null) {
    try {
      let query = db.collection('system_settings')
        .doc('email_logs')
        .collection('entries')
        .orderBy('sentAt', 'desc')
        .limit(limit);

      if (startAfter) {
        const startDoc = await db.collection('system_settings')
          .doc('email_logs')
          .collection('entries')
          .doc(startAfter)
          .get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, logs };
    } catch (error) {
      console.error('Error fetching logs:', error);
      return { success: false, error: error.message, logs: [] };
    }
  }

  /**
   * Get email analytics summary
   */
  async getAnalytics(timeRange = 'day') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch(timeRange) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }

      const snapshot = await db.collection('system_settings')
        .doc('email_logs')
        .collection('entries')
        .where('sentAt', '>=', startDate.toISOString())
        .get();

      const stats = {
        total: 0,
        sent: 0,
        failed: 0,
        bounced: 0,
        byType: {},
        recentFailures: []
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        
        if (data.status === 'sent') stats.sent++;
        else if (data.status === 'failed') {
          stats.failed++;
          stats.recentFailures.push({
            id: doc.id,
            recipient: data.recipient,
            error: data.error,
            sentAt: data.sentAt
          });
        } else if (data.status === 'bounced') {
          stats.bounced++;
        }

        const type = data.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Calculate success rate
      stats.successRate = stats.total > 0 
        ? Math.round((stats.sent / stats.total) * 100) 
        : 0;

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error: error.message, stats: null };
    }
  }

  /**
   * Clean old logs (keep last 30 days)
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const snapshot = await db.collection('system_settings')
        .doc('email_logs')
        .collection('entries')
        .where('sentAt', '<', cutoffDate.toISOString())
        .get();

      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Cleaned ${snapshot.size} old email logs`);
      return { success: true, deleted: snapshot.size };
    } catch (error) {
      console.error('Error cleaning logs:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailLogService();