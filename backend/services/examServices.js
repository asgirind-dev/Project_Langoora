const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');
const emailLogService = require('./emailLogService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
    this.initialized = false;
  }

  async loadConfig() {
    try {
      const configDoc = await db.collection('system_settings').doc('global_config').get();
      this.config = configDoc.exists ? configDoc.data() : null;
      return this.config;
    } catch (error) {
      console.error('Failed to load email config from Firestore:', error.message);
      return null;
    }
  }

  getSenderEmail() {
    return this.config?.senderEmail || process.env.SMTP_USER || process.env.EMAIL_USER || 'asgirind186@gmail.com';
  }

  getSenderName() {
    return this.config?.senderName || 'Langoora Platform';
  }

  getSenderInfo() {
    return `"${this.getSenderName()}" <${this.getSenderEmail()}>`;
  }

  /**
   * Initialize Gmail Transporter (IPv4 Forced & Direct SSL)
   */
  async initialize() {
    try {
      await this.loadConfig();

      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

      if (!smtpUser || !smtpPass) {
        console.error('❌ SMTP credentials missing in .env!');
        throw new Error('SMTP credentials missing');
      }

      console.log('📧 Initializing Gmail IPv4 direct service...');

      // ✅ FIX: SSL Port 465 + Family 4 (Force IPv4 to bypass ENETUNREACH)
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        family: 4, // 👈 FORCES IPv4 (Fixes ENETUNREACH network error)
        tls: {
          rejectUnauthorized: false
        }
      });

      await this.transporter.verify();
      this.initialized = true;
      console.log(`✅ Email service initialized successfully for: ${smtpUser}`);
      return true;

    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized || !this.transporter) {
      console.log('⚠️ Email service not initialized, initializing now...');
      await this.initialize();
    }
    if (!this.initialized || !this.transporter) {
      throw new Error('Email service failed to initialize.');
    }
    return true;
  }

  getHeaderHtml() {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `
      <div style="text-align: center; padding-bottom: 28px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 28px;">
        <a href="${frontendUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 12px; text-align: center; line-height: 36px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);">
                  <img src="https://img.icons8.com/ios-filled/50/ffffff/open-book.png" width="18" height="18" alt="Langoora Logo" style="vertical-align: middle; margin-top: -2px; display: inline-block;" />
                </div>
              </td>
              <td style="vertical-align: middle; padding-left: 10px;">
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Langoora</span><span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 800; color: #06b6d4;">.com</span>
              </td>
            </tr>
          </table>
        </a>
        <p style="color: #64748b; margin: 6px 0 0 0; font-size: 11px; letter-spacing: 1px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          PRECISION CBTs FOR LANGUAGE MASTERY
        </p>
      </div>
    `;
  }

  getFooterHtml(supportEmail = 'support@langoora.com') {
    return `
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; color: #64748b; font-size: 12px; line-height: 1.8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <p style="margin: 0 0 6px 0;">
          This is an automated notification from Langoora.<br>
          If you have any questions, please contact our support team at 
          <a href="mailto:${supportEmail}" style="color: #38bdf8; text-decoration: none;">${supportEmail}</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #475569;">
          &copy; ${new Date().getFullYear()} Langoora. All rights reserved.
        </p>
      </div>
    `;
  }

  // 🔔 1. SEND SYSTEM NOTIFICATION EMAIL
  async sendNotificationEmail(toEmail, title, message) {
    const logData = {
      recipient: toEmail,
      type: 'system_notification',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: `Langoora Alert: ${title}`,
      metadata: { title, message }
    };

    try {
      await this.ensureInitialized();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>${title}</title></head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  ${this.getHeaderHtml()}
                  <div style="padding: 10px 0;">
                    <h2 style="color: #38bdf8; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">${title}</h2>
                    <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-left: 4px solid #38bdf8; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">${message}</p>
                    </div>
                  </div>
                  ${this.getFooterHtml()}
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.getSenderInfo(),
        to: toEmail,
        subject: `Langoora Notification: ${title}`,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);

      console.log(`✅ Notification Email sent successfully to ${toEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      console.error('❌ Failed to send notification email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 📚 2. SEND CATEGORY CREATED EMAIL
  async sendCategoryCreatedEmail(financeEmail, categoryName, language, categoryId, createdBy) {
    const logData = {
      recipient: financeEmail,
      type: 'category_created',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: `📚 New Exam Category Created: ${categoryName}`,
      metadata: { categoryName, language, categoryId, createdBy }
    };

    try {
      await this.ensureInitialized();

      const financeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Exam Category Created</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      📚 New Exam Category Created
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      A new exam category has been created by <strong style="color: #ffffff;">${createdBy}</strong>.
                    </p>

                    <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #38bdf8; margin: 0 0 12px 0; font-size: 14px; font-weight: 700;">Category Details</h3>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Category Name</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${categoryName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Language</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${language}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Category ID</td>
                          <td style="color: #38bdf8; font-size: 12px; text-align: right; font-family: monospace;">${categoryId}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #fbbf24; font-size: 13px; margin: 0; line-height: 1.6;">
                        ⏳ <strong>Action Required:</strong> Please review this new category and configure credit values for its levels.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${financeUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        Configure Credit Values →
                      </a>
                    </div>
                  </div>

                  ${this.getFooterHtml()}

                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.getSenderInfo(),
        to: financeEmail,
        subject: `📚 New Exam Category Created: ${categoryName}`,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Category created email sent to ${financeEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send category created email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 📝 3. SEND LEVEL CREATED EMAIL
  async sendLevelCreatedEmail(financeEmail, levelName, categoryName, categoryId, levelId, createdBy) {
    const logData = {
      recipient: financeEmail,
      type: 'level_created',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: `📝 New Level Created: ${levelName}`,
      metadata: { levelName, categoryName, categoryId, levelId, createdBy }
    };

    try {
      await this.ensureInitialized();

      const financeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Level Created</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      📝 New Exam Level Created
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      A new level has been added to <strong style="color: #ffffff;">${categoryName}</strong> by <strong style="color: #ffffff;">${createdBy}</strong>.
                    </p>

                    <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #38bdf8; margin: 0 0 12px 0; font-size: 14px; font-weight: 700;">Level Details</h3>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Level Name</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${levelName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Category</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${categoryName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Level ID</td>
                          <td style="color: #38bdf8; font-size: 12px; text-align: right; font-family: monospace;">${levelId}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #fbbf24; font-size: 13px; margin: 0; line-height: 1.6;">
                        ⏳ <strong>Action Required:</strong> Credit valuation is pending for this level. Please set the credit value.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${financeUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        Set Credit Value →
                      </a>
                    </div>
                  </div>

                  ${this.getFooterHtml()}

                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.getSenderInfo(),
        to: financeEmail,
        subject: `📝 New Level Created: ${levelName}`,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Level created email sent to ${financeEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send level created email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();