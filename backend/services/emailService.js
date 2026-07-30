// backend/services/emailService.js
const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');
const emailLogService = require('./emailLogService');
const emailRateLimitService = require('./emailRateLimitService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
    this.initialized = false;
  }

  /**
   * Load configuration from Firestore
   */
  async loadConfig() {
    try {
      const configDoc = await db.collection('system_settings').doc('global_config').get();
      this.config = configDoc.exists ? configDoc.data() : null;
      console.log('✅ Firestore config loaded:', this.config ? 'Yes' : 'No');
      return this.config;
    } catch (error) {
      console.error('Failed to load email config from Firestore:', error.message);
      return null;
    }
  }

  /**
   * Get sender email from system settings or fallback to env
   */
  getSenderEmail() {
    return this.config?.senderEmail || process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@langoora.com';
  }

  /**
   * Get sender name from system settings or fallback
   */
  getSenderName() {
    return this.config?.senderName || 'Langoora';
  }

  /**
   * Get complete sender info
   */
  getSenderInfo() {
    const name = this.getSenderName();
    const email = this.getSenderEmail();
    return `${name} <${email}>`;
  }

  /**
   * Initialize email transporter with system settings
   */
  async initialize() {
    try {
      await this.loadConfig();

      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
      const smtpSecure = process.env.SMTP_SECURE === 'true' || false;

      if (!smtpUser || !smtpPass) {
        console.error('❌ SMTP credentials missing!');
        console.error('   SMTP_USER:', smtpUser ? 'Set' : 'Missing');
        console.error('   SMTP_PASS:', smtpPass ? 'Set' : 'Missing');
        throw new Error('SMTP credentials are missing. Check your .env file.');
      }

      console.log('📧 Initializing email service...');
      console.log(`   SMTP Host: ${smtpHost}`);
      console.log(`   SMTP Port: ${smtpPort}`);
      console.log(`   SMTP User: ${smtpUser}`);
      console.log(`   SMTP Secure: ${smtpSecure}`);

      const smtpConfig = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      };

      this.transporter = nodemailer.createTransport(smtpConfig);
      await this.transporter.verify();
      this.initialized = true;
      console.log(`✅ Email service initialized successfully!`);
      console.log(`   Sender: ${this.getSenderInfo()}`);
      return true;

    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure transporter is initialized before sending
   */
  async ensureInitialized() {
    if (!this.initialized || !this.transporter) {
      console.log('⚠️ Email service not initialized, initializing now...');
      await this.initialize();
    }
    if (!this.initialized || !this.transporter) {
      throw new Error('Email service failed to initialize. Check your configuration.');
    }
    return true;
  }

  /**
   * Helper: Header HTML matching logo.html branding exactly
   */
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

  /**
   * Helper: Footer HTML
   */
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

  // =========================================================================
  // 📚 SEND TUTOR APPROVAL EMAIL
  // =========================================================================
  async sendTutorApprovalEmail(tutorEmail, tutorName, tutorId) {
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_approval',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '🎓 Tutor Application Approved - Langoora',
      metadata: { tutorName, tutorId }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tutor Application Approved - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      Congratulations, <span style="color: #38bdf8;">${tutorName}</span>! 🎉
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 16px 0;">
                      Your application to become a <strong style="color: #38bdf8;">Langoora Tutor</strong> has been <strong style="color: #34d399;">approved</strong>!
                    </p>

                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #34d399; font-size: 13px; margin: 0; line-height: 1.6;">
                        ✅ Your tutor account is now active. You can start creating and managing your courses.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tutor/dashboard" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center;">
                        🚀 Go to Tutor Dashboard
                      </a>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
                      <strong style="color: #94a3b8;">Need help?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        to: tutorEmail,
        subject: '🎓 Tutor Application Approved - Langoora',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Tutor approval email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      console.error('❌ Failed to send tutor approval email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // 📚 SEND TUTOR REJECTION EMAIL
  // =========================================================================
  async sendTutorRejectionEmail(tutorEmail, tutorName, rejectionReason = null) {
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_rejection',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '📋 Tutor Application Update - Langoora',
      metadata: { tutorName, rejectionReason }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      const reasonText = rejectionReason || 'Your application did not meet our current requirements.';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tutor Application Update - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      Application Update, <span style="color: #f87171;">${tutorName}</span>
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 16px 0;">
                      Thank you for your interest in becoming a <strong style="color: #38bdf8;">Langoora Tutor</strong>.
                    </p>

                    <div style="background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #f87171; font-size: 13px; margin: 0; line-height: 1.6;">
                        <strong>Reason:</strong> ${reasonText}
                      </p>
                    </div>

                    <p style="color: #94a3b8; line-height: 1.7; font-size: 13px; margin: 16px 0;">
                      You can reapply at any time with updated qualifications or additional information.
                    </p>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tutor/apply" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: white/10; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.15);">
                        📝 Reapply as Tutor
                      </a>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
                      <strong style="color: #94a3b8;">Questions?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        to: tutorEmail,
        subject: '📋 Tutor Application Update - Langoora',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Tutor rejection email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      console.error('❌ Failed to send tutor rejection email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // 📚 SEND TEST EMAIL - ✅ NOW FULLY IMPLEMENTED
  // =========================================================================
  async sendTestEmail(to, senderEmail, senderName) {
    const logData = {
      recipient: to,
      type: 'test',
      senderEmail: senderEmail || this.getSenderEmail(),
      senderName: senderName || this.getSenderName(),
      subject: '📧 Test Email from Langoora',
      metadata: { senderEmail, senderName }
    };

    try {
      // Rate limit check
      const rateCheck = await emailRateLimitService.canSend(to);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${to}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      // Ensure email service is initialized
      await this.ensureInitialized();
      await this.loadConfig();

      // Get sender info from system settings or use provided values
      const fromEmail = senderEmail || this.getSenderEmail();
      const fromName = senderName || this.getSenderName();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      ✅ Test Email from <span style="color: #38bdf8;">Langoora</span>
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      This is a <strong>test email</strong> sent from your Langoora platform configuration.
                      <br><br>
                      <span style="color: #38bdf8;">📧 Sender: ${fromName} &lt;${fromEmail}&gt;</span>
                    </p>

                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #34d399; font-size: 13px; margin: 0; line-height: 1.6;">
                        ✅ Your email configuration is working correctly!
                      </p>
                    </div>

                    <div style="background: #0f1629; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 3px solid #fbbf24;">
                      <h4 style="color: #fbbf24; margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">📋 Email Configuration Details</h4>
                      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0; line-height: 1.6;">
                        <strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}<br>
                        <strong>SMTP Port:</strong> ${process.env.SMTP_PORT || '587'}<br>
                        <strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;<br>
                        <strong>To:</strong> ${to}
                      </p>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
                      <strong style="color: #94a3b8;">Need help?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: '📧 Test Email from Langoora',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Test email sent to ${to} from ${fromEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send test email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // 📚 SEND SUBSCRIPTION CONFIRMATION EMAIL
  // =========================================================================
  async sendSubscriptionConfirmationEmail(studentEmail, studentName, planName, amount, credits) {
    const logData = {
      recipient: studentEmail,
      type: 'subscription',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '✅ Subscription Confirmed - Langoora',
      metadata: { studentName, planName, amount, credits }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(studentEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Confirmed - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      Subscription Confirmed! 🎉
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 16px 0;">
                      Thank you <strong style="color: #38bdf8;">${studentName}</strong> for subscribing to <strong>${planName}</strong>!
                    </p>

                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #34d399; font-size: 13px; margin: 0; line-height: 1.8;">
                        ✅ Plan: <strong>${planName}</strong><br>
                        ✅ Amount Paid: <strong>LKR ${amount}</strong><br>
                        ✅ Credits Added: <strong>${credits} Credits</strong>
                      </p>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/dashboard" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center;">
                        📚 Go to Dashboard
                      </a>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
                      <strong style="color: #94a3b8;">Questions?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        to: studentEmail,
        subject: '✅ Subscription Confirmed - Langoora',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Subscription confirmation email sent to ${studentEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      console.error('❌ Failed to send subscription confirmation email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // 📚 SEND CATEGORY CREATED EMAIL
  // =========================================================================
  async sendCategoryCreatedEmail(financeEmail, categoryName, language, categoryId, createdBy) {
    const logData = {
      recipient: financeEmail,
      type: 'category_created',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '📚 New Category Created - Langoora',
      metadata: { categoryName, language, categoryId, createdBy }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(financeEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Category Created - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      New Category Created 📚
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 16px 0;">
                      A new category has been created in the system.
                    </p>

                    <div style="background: #0f1629; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 3px solid #38bdf8;">
                      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0; line-height: 1.8;">
                        <strong>Category:</strong> ${categoryName}<br>
                        <strong>Language:</strong> ${language}<br>
                        <strong>Category ID:</strong> ${categoryId}<br>
                        <strong>Created By:</strong> ${createdBy}
                      </p>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
                      <strong style="color: #94a3b8;">Questions?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        subject: '📚 New Category Created - Langoora',
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

  // =========================================================================
  // 📚 SEND LEVEL CREATED EMAIL
  // =========================================================================
  async sendLevelCreatedEmail(financeEmail, levelName, categoryName, categoryId, levelId, createdBy) {
    const logData = {
      recipient: financeEmail,
      type: 'level_created',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '📊 New Level Created - Langoora',
      metadata: { levelName, categoryName, categoryId, levelId, createdBy }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(financeEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Level Created - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      New Level Created 📊
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 16px 0;">
                      A new level has been added to an existing category.
                    </p>

                    <div style="background: #0f1629; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 3px solid #fbbf24;">
                      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0; line-height: 1.8;">
                        <strong>Level:</strong> ${levelName}<br>
                        <strong>Category:</strong> ${categoryName}<br>
                        <strong>Category ID:</strong> ${categoryId}<br>
                        <strong>Level ID:</strong> ${levelId}<br>
                        <strong>Created By:</strong> ${createdBy}
                      </p>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
                      <strong style="color: #94a3b8;">Questions?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>
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
        subject: '📊 New Level Created - Langoora',
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

  // ================================================================
  // 📧 SEND PASSWORD RESET EMAIL
  // ================================================================
  async sendPasswordResetEmail({ to, name, resetLink, frontendUrl }) {
    const logData = {
      recipient: to,
      type: 'password_reset',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: '🔐 Reset Your Password - Langoora',
      metadata: { name }
    };

    try {
      // Rate limit check
      const rateCheck = await emailRateLimitService.canSend(to);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${to}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      // Ensure email service is initialized
      await this.ensureInitialized();
      await this.loadConfig();

      const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - Langoora</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      Reset Your Password, <span style="color: #38bdf8;">${name || 'User'}</span>
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      We received a request to reset the password for your Langoora account. 
                      Click the button below to create a new password.
                    </p>

                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                      <p style="color: #fbbf24; font-size: 13px; margin: 0; line-height: 1.6;">
                        ⏳ This password reset link will expire in <strong>1 hour</strong>.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${resetLink}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        🔐 Reset Password
                      </a>
                    </div>

                    <div style="border-top: 1px dashed rgba(255,255,255,0.1); margin: 24px 0;"></div>

                    <div style="background: #0f1629; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 3px solid #38bdf8;">
                      <h4 style="color: #38bdf8; margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">Didn't request this?</h4>
                      <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">
                        If you didn't request a password reset, please ignore this email. 
                        Your password will remain unchanged.
                      </p>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
                      <strong style="color: #94a3b8;">Need help?</strong> Contact support at 
                      <a href="mailto:support@langoora.com" style="color: #38bdf8; text-decoration: none;">support@langoora.com</a>
                    </p>

                    <p style="font-size: 11px; color: #475569; text-align: center; margin: 12px 0 0 0;">
                      For security reasons, do not share this link with anyone.
                    </p>
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
        to: to,
        subject: '🔐 Reset Your Password - Langoora',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Password reset email sent to ${to}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send password reset email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();