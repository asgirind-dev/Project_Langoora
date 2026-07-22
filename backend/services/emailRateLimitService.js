// backend/services/emailRateLimitService.js
const { db } = require('../config/firebase');

class EmailRateLimitService {
  constructor() {
    this.defaultLimits = {
      perHour: 100,
      perDay: 500,
      perMinute: 10
    };
  }

  /**
   * Get current rate limits from config
   */
  async getRateLimits() {
    try {
      const doc = await db.collection('system_settings')
        .doc('email_controls')
        .get();
      
      if (doc.exists) {
        const data = doc.data();
        return {
          perHour: data.rateLimitPerHour || this.defaultLimits.perHour,
          perDay: data.rateLimitPerDay || this.defaultLimits.perDay,
          perMinute: data.rateLimitPerMinute || this.defaultLimits.perMinute
        };
      }
      return this.defaultLimits;
    } catch (error) {
      console.error('Error getting rate limits:', error);
      return this.defaultLimits;
    }
  }

  /**
   * Update rate limits
   */
  async updateRateLimits(limits) {
    try {
      const docRef = db.collection('system_settings').doc('email_controls');
      const data = {
        rateLimitPerHour: limits.perHour || this.defaultLimits.perHour,
        rateLimitPerDay: limits.perDay || this.defaultLimits.perDay,
        rateLimitPerMinute: limits.perMinute || this.defaultLimits.perMinute,
        updatedAt: new Date().toISOString()
      };
      
      await docRef.set(data, { merge: true });
      return { success: true, limits: data };
    } catch (error) {
      console.error('Error updating rate limits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if sending is allowed
   */
  async canSend(recipient = null) {
    try {
      const limits = await this.getRateLimits();
      const now = new Date();
      
      // Check per minute
      const minuteAgo = new Date(now.getTime() - 60 * 1000);
      const minuteCount = await this.countEmails(minuteAgo);
      if (minuteCount >= limits.perMinute) {
        return { allowed: false, reason: 'Rate limit exceeded (per minute)', limit: limits.perMinute };
      }

      // Check per hour
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const hourCount = await this.countEmails(hourAgo);
      if (hourCount >= limits.perHour) {
        return { allowed: false, reason: 'Rate limit exceeded (per hour)', limit: limits.perHour };
      }

      // Check per day
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dayCount = await this.countEmails(dayAgo);
      if (dayCount >= limits.perDay) {
        return { allowed: false, reason: 'Rate limit exceeded (per day)', limit: limits.perDay };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Count emails sent after a given time
   */
  async countEmails(since) {
    try {
      const snapshot = await db.collection('system_settings')
        .doc('email_logs')
        .collection('entries')
        .where('sentAt', '>=', since.toISOString())
        .get();
      
      return snapshot.size;
    } catch (error) {
      console.error('Error counting emails:', error);
      return 0;
    }
  }

  /**
   * Get rate limit status
   */
  async getStatus() {
    try {
      const limits = await this.getRateLimits();
      const now = new Date();
      
      const minuteAgo = new Date(now.getTime() - 60 * 1000);
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [minuteCount, hourCount, dayCount] = await Promise.all([
        this.countEmails(minuteAgo),
        this.countEmails(hourAgo),
        this.countEmails(dayAgo)
      ]);

      return {
        limits,
        current: {
          perMinute: minuteCount,
          perHour: hourCount,
          perDay: dayCount
        },
        remaining: {
          perMinute: Math.max(0, limits.perMinute - minuteCount),
          perHour: Math.max(0, limits.perHour - hourCount),
          perDay: Math.max(0, limits.perDay - dayCount)
        }
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }
}

module.exports = new EmailRateLimitService();