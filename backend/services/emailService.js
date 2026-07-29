const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');
const emailLogService = require('./emailLogService');

class EmailService {
  constructor() {
    const isSecure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';

    // 📧 Setup Nodemailer Transporter (Direct SSL Support on Port 465)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: isSecure, // true for 465
      auth: {
        user: process.env.SMTP_USER || 'asgirind186@gmail.com',
        pass: process.env.SMTP_PASS || 'lawjbrxaermacijm'
      },
      connectionTimeout: 10000, // 10s Connection Timeout
      greetingTimeout: 10000,   // 10s Greeting Timeout
      socketTimeout: 10000,     // 10s Socket Timeout
      tls: {
        rejectUnauthorized: false
      }
    });

    this.defaultAdminEmail = process.env.ADMIN_EMAIL || 'asgirind186@gmail.com';
  }

  // 💡 Required for TutorValidationService & Other Services Initialization
  async initialize() {
    return true;
  }

  async ensureInitialized() {
    return true;
  }

  getSenderInfo() {
    return `"Langoora Platform" <${process.env.SMTP_USER || 'asgirind186@gmail.com'}>`;
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

  // 1. Send Generic Notification Email
  async sendNotificationEmail(toEmail, title, message) {
    const recipient = toEmail || this.defaultAdminEmail;
    const subject = `Langoora Alert: ${title}`;

    const logData = {
      recipient: recipient,
      type: 'system_notification',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { title, message, originalRecipient: toEmail }
    };

    try {
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
        to: recipient,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }

      console.log(`✅ [Nodemailer] Email sent successfully to ${recipient}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }
      console.error('❌ [Nodemailer] Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 2. Subscription Plan Approved / Rejected Email (Sent to Plan Creator)
  async sendPlanStatusEmail(toEmail, planName, status, notes = '') {
    const isApproved = status === 'approved';
    const recipient = toEmail || 'himashikashmira30@gmail.com';
    const subject = isApproved ? `🎉 Subscription Plan Approved: ${planName}` : `⚠️ Action Required: Subscription Plan Rejected (${planName})`;

    const logData = {
      recipient: recipient,
      type: isApproved ? 'plan_approved' : 'plan_rejected',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { planName, status, notes, originalRecipient: toEmail }
    };

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const actionUrl = `${frontendUrl}/finance-admin/subscriptions`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${isApproved ? 'Plan Approved' : 'Plan Rejected'}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: ${isApproved ? '#34d399' : '#f87171'}; margin: 0 0 16px 0;">
                      ${isApproved ? '🎉 Subscription Plan Approved!' : '⚠️ Subscription Plan Rejected'}
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      Your created subscription tier <strong style="color: #ffffff;">"${planName}"</strong> has been reviewed by the Admin team.
                    </p>

                    <div style="background: ${isApproved ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)'}; border: 1px solid ${isApproved ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)'}; border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: ${isApproved ? '#34d399' : '#f87171'}; margin: 0 0 12px 0; font-size: 14px; font-weight: 700;">Review Status</h3>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Plan Name</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${planName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Status</td>
                          <td style="color: ${isApproved ? '#34d399' : '#f87171'}; font-size: 13px; text-align: right; font-weight: 700; text-transform: uppercase;">${status}</td>
                        </tr>
                        ${notes ? `
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 8px 0 0 0;" colspan="2">
                            <strong style="color: #cbd5e1;">Admin Reason / Notes:</strong><br>
                            <span style="color: #94a3b8; font-style: italic;">"${notes}"</span>
                          </td>
                        </tr>` : ''}
                      </table>
                    </div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${actionUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        ${isApproved ? 'View Subscriptions Portal →' : 'Edit & Resubmit Plan →'}
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
        to: recipient,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }

      console.log(`✅ [Nodemailer] Plan status email sent to ${recipient}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }
      console.error('❌ [Nodemailer] Failed to send plan status email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 3. Category Created Email (Sent to Finance Admin / Himi)
  async sendCategoryCreatedEmail(financeEmail, categoryName, language, categoryId, createdBy) {
    const recipient = financeEmail || 'himashikashmira30@gmail.com';
    const subject = `📚 New Exam Category Created: ${categoryName}`;

    const logData = {
      recipient: recipient,
      type: 'category_created',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { categoryName, language, categoryId, createdBy, originalRecipient: financeEmail }
    };

    try {
      const financeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
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
        to: recipient,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }

      console.log(`✅ [Nodemailer] Category created email sent to ${recipient}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }
      console.error('❌ [Nodemailer] Failed to send category created email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 4. Level Created Email (Sent to Finance Admin / Himi)
  async sendLevelCreatedEmail(financeEmail, levelName, categoryName, categoryId, levelId, createdBy) {
    const recipient = financeEmail || 'himashikashmira30@gmail.com';
    const subject = `📝 New Level Created: ${levelName}`;

    const logData = {
      recipient: recipient,
      type: 'level_created',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { levelName, categoryName, categoryId, levelId, createdBy, originalRecipient: financeEmail }
    };

    try {
      const financeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
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
        to: recipient,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }

      console.log(`✅ [Nodemailer] Level created email sent to ${recipient}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) {
        await emailLogService.logEmail(logData);
      }
      console.error('❌ [Nodemailer] Failed to send level created email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 5. Exam Credit Configured Email (Sent to Main Admin: asgirind186@gmail.com)
  async sendCreditConfiguredEmail(adminEmail, examName, creditValue, configuredBy = 'Finance Admin') {
    const recipient = adminEmail || this.defaultAdminEmail;
    const subject = `💳 Exam Credits Configured: ${examName}`;

    const logData = {
      recipient: recipient,
      type: 'credit_configured',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { examName, creditValue, configuredBy }
    };

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const actionUrl = `${frontendUrl}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Exam Credits Configured</title></head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  ${this.getHeaderHtml()}
                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #34d399; margin: 0 0 16px 0;">
                      💳 Exam Credits Configured
                    </h1>
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      Credit valuation for <strong style="color: #ffffff;">"${examName}"</strong> has been successfully configured and approved by <strong style="color: #ffffff;">${configuredBy}</strong>.
                    </p>
                    <div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Exam / Level</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${examName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Configured Credit Value</td>
                          <td style="color: #34d399; font-size: 16px; text-align: right; font-weight: 800;">${creditValue} Credits</td>
                        </tr>
                      </table>
                    </div>
                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${actionUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        View Exam Credits Portal →
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

      const info = await this.transporter.sendMail({
        from: this.getSenderInfo(),
        to: recipient,
        subject: subject,
        html: htmlContent
      });

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) await emailLogService.logEmail(logData);

      console.log(`✅ [Nodemailer] Credit Configured Email sent to ${recipient}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) await emailLogService.logEmail(logData);
      console.error('❌ [Nodemailer] Failed to send credit configured email:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 6. Exam Credit Revision Requested Email (Sent to Main Admin: asgirind186@gmail.com)
  async sendCreditRevisionEmail(adminEmail, examName, reason = '', requestedBy = 'Finance Admin') {
    const recipient = adminEmail || this.defaultAdminEmail;
    const subject = `⚠️ Exam Credit Valuation Pending Revision: ${examName}`;

    const logData = {
      recipient: recipient,
      type: 'credit_revision_requested',
      senderEmail: process.env.SMTP_USER,
      senderName: 'Langoora Platform',
      subject: subject,
      metadata: { examName, reason, requestedBy }
    };

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const actionUrl = `${frontendUrl}/finance-admin/exam-credits`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Exam Credit Revision Pending</title></head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  ${this.getHeaderHtml()}
                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #fbbf24; margin: 0 0 16px 0;">
                      ⚠️ Exam Credit Valuation Pending Revision
                    </h1>
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      Finance Admin (<strong style="color: #ffffff;">${requestedBy}</strong>) has requested a revision / rejected the proposed credit value for <strong style="color: #ffffff;">"${examName}"</strong>.
                    </p>
                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #fbbf24; margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Revision Details</h3>
                      <p style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;">
                        ${reason ? `<strong>Reason / Notes:</strong> "${reason}"` : 'Please review and re-adjust the credit requirements.'}
                      </p>
                    </div>
                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${actionUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        Review & Re-adjust Credits →
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

      const info = await this.transporter.sendMail({
        from: this.getSenderInfo(),
        to: recipient,
        subject: subject,
        html: htmlContent
      });

      logData.status = 'sent';
      logData.messageId = info.messageId;
      if (emailLogService && emailLogService.logEmail) await emailLogService.logEmail(logData);

      console.log(`✅ [Nodemailer] Credit Revision Email sent to ${recipient}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      if (emailLogService && emailLogService.logEmail) await emailLogService.logEmail(logData);
      console.error('❌ [Nodemailer] Failed to send credit revision email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();