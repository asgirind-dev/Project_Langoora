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

  /**
   * Send tutor approval email - With Logging & Rate Limiting
   */
  async sendTutorApprovalEmail(tutorEmail, tutorName, tutorId) {
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_approval',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: 'Welcome to Langoora – Your Tutor Account is Now Active',
      metadata: { tutorId, tutorName }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${tutorEmail}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();
      await this.loadConfig();

      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Langoora - Tutor Account Approved</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; line-height: 1.4;">
                      Welcome aboard, <span style="color: #38bdf8;">${tutorName}</span>!
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      We are pleased to inform you that your tutor application has been <strong style="color: #ffffff;">approved</strong>. 
                      Your qualifications have been verified, and you are now officially part of the Langoora tutor community.
                    </p>

                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px 20px; margin: 20px 0; text-align: center;">
                      <h3 style="color: #34d399; margin: 0 0 4px 0; font-size: 16px; font-weight: 700;">Account Activated</h3>
                      <p style="color: #6ee7b7; margin: 0; font-size: 13px;">Your tutor dashboard is now accessible.</p>
                    </div>

                    <div style="border-top: 1px dashed rgba(255,255,255,0.1); margin: 24px 0;"></div>

                    <div style="margin: 20px 0;">
                      <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; margin: 0 0 16px 0; text-align: center;">
                        What You Can Do Now
                      </h4>
                      
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="50%" style="padding: 0 6px 12px 0;">
                            <div style="background: #0f1629; padding: 14px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                              <div style="width: 26px; height: 26px; margin: 0 auto 6px auto; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; color: #38bdf8; font-size: 12px; font-weight: 700; line-height: 26px;">01</div>
                              <div style="font-size: 12px; color: #ffffff; font-weight: 600;">Create Exam Packs</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Design & publish mock exams</div>
                            </div>
                          </td>
                          <td width="50%" style="padding: 0 0 12px 6px;">
                            <div style="background: #0f1629; padding: 14px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                              <div style="width: 26px; height: 26px; margin: 0 auto 6px auto; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; color: #38bdf8; font-size: 12px; font-weight: 700; line-height: 26px;">02</div>
                              <div style="font-size: 12px; color: #ffffff; font-weight: 600;">Earn Revenue</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Monetize your expertise</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding: 0 6px 0 0;">
                            <div style="background: #0f1629; padding: 14px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                              <div style="width: 26px; height: 26px; margin: 0 auto 6px auto; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; color: #38bdf8; font-size: 12px; font-weight: 700; line-height: 26px;">03</div>
                              <div style="font-size: 12px; color: #ffffff; font-weight: 600;">Track Performance</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Monitor exam analytics</div>
                            </div>
                          </td>
                          <td width="50%" style="padding: 0 0 0 6px;">
                            <div style="background: #0f1629; padding: 14px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                              <div style="width: 26px; height: 26px; margin: 0 auto 6px auto; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; color: #38bdf8; font-size: 12px; font-weight: 700; line-height: 26px;">04</div>
                              <div style="font-size: 12px; color: #ffffff; font-weight: 600;">View Reviews</div>
                              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">See student feedback</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="border-top: 1px dashed rgba(255,255,255,0.1); margin: 24px 0;"></div>

                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <a href="${loginLink}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                        Sign In to Your Account →
                      </a>
                    </div>

                    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
                      <strong style="color: #94a3b8;">Next Steps:</strong> Once signed in, start by creating your first exam pack and setting your pricing. Students are waiting to learn from your expertise.
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
        subject: 'Welcome to Langoora – Your Tutor Account is Now Active',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Approval email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send approval email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send tutor rejection email with reason - With Logging & Rate Limiting
   */
  async sendTutorRejectionEmail(tutorEmail, tutorName, rejectionReason = null) {
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_rejection',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: 'Langoora – Update on Your Tutor Application',
      metadata: { tutorName, rejectionReason }
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${tutorEmail}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();
      await this.loadConfig();

      const supportEmail = process.env.SUPPORT_EMAIL || 'support@langoora.com';
      const signupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/register?role=tutor`;

      const defaultReason = 'Your application did not meet our qualification requirements at this time.';
      const reason = rejectionReason || defaultReason;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Langoora - Tutor Application Update</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  
                  ${this.getHeaderHtml()}

                  <div style="padding: 0 4px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                      Hello <span style="color: #f87171;">${tutorName}</span>,
                    </h1>
                    
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 14px; margin: 0 0 20px 0;">
                      We have carefully reviewed your tutor application. After thorough evaluation of your 
                      submitted qualifications and credentials, we regret to inform you that your application 
                      has been <strong style="color: #f87171;">declined</strong> at this time.
                    </p>

                    <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #f87171; margin: 0 0 8px 0; font-size: 15px; font-weight: 700; text-align: center;">Application Status: Declined</h3>
                      <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 6px;">Reason for Decision</span>
                      <p style="background: #18090a; padding: 12px 14px; border-radius: 8px; color: #fca5a5; font-size: 13px; border-left: 3px solid #f87171; line-height: 1.6; margin: 0;">
                        "${reason}"
                      </p>
                    </div>

                    <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px;">
                      We encourage you to review our tutor requirements and consider reapplying in the future with additional qualifications or updated credentials.
                    </p>

                    <div style="border-top: 1px dashed rgba(255,255,255,0.1); margin: 24px 0;"></div>

                    <div style="background: #0f1629; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 3px solid #38bdf8;">
                      <h4 style="color: #38bdf8; margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">Need Clarification?</h4>
                      <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">
                        If you believe this decision was made in error or need further clarification, please contact our support team at 
                        <a href="mailto:${supportEmail}" style="color: #38bdf8; text-decoration: none;">${supportEmail}</a>.
                      </p>
                    </div>

                    <div style="margin: 24px 0;">
                      <a href="${signupLink}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 12px 24px; background: #3b82f6; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; text-align: center; margin-bottom: 10px;">
                        Reapply as Tutor
                      </a>
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 12px 24px; background: transparent; color: #94a3b8 !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; text-align: center; border: 1px solid #334155;">
                        Return to Langoora
                      </a>
                    </div>
                  </div>

                  ${this.getFooterHtml(supportEmail)}

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
        subject: 'Langoora – Update on Your Tutor Application',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Rejection email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send rejection email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email - For system settings testing with Logging & Rate Limiting
   */
  async sendTestEmail(to, senderEmail, senderName) {
    const logData = {
      recipient: to,
      type: 'test',
      senderEmail: senderEmail || this.getSenderEmail(),
      senderName: senderName || this.getSenderName(),
      subject: 'Langoora – Email Configuration Test'
    };

    try {
      const rateCheck = await emailRateLimitService.canSend(to);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for test email: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();
      await this.loadConfig();

      const fromName = senderName || this.getSenderName();
      const fromEmail = senderEmail || this.getSenderEmail();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Langoora - Email Test</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e0e0e0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 30px 10px;">
            <tr>
              <td align="center">
                <div style="max-width: 580px; margin: 0 auto; padding: 36px 28px; background: #0a0e1a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);">
                  
                  ${this.getHeaderHtml()}

                  <div style="text-align: center; padding: 0 4px;">
                    <div style="width: 52px; height: 52px; margin: 0 auto 16px auto; line-height: 52px; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.35); border-radius: 14px; color: #34d399; font-size: 20px; font-weight: 700;">✓</div>
                    <h2 style="color: #34d399; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">Email Configuration Test</h2>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">If you are reading this email, your email settings are configured correctly!</p>
                    
                    <div style="background: #0f1629; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; margin: 20px 0; text-align: left;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Sender Name</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${fromName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Sender Email</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${fromEmail}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Sent To</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${to}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Time</td>
                          <td style="color: #ffffff; font-size: 13px; text-align: right; font-weight: 600;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}</td>
                        </tr>
                      </table>
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
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: 'Langoora – Email Configuration Test',
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Test email sent to ${to}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send test email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();