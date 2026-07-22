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
      // Load config from Firestore first
      await this.loadConfig();

      // Get SMTP settings from environment - with explicit fallbacks
      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
      const smtpSecure = process.env.SMTP_SECURE === 'true' || false;

      // Validate credentials
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
      
      // Verify connection
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
   * Send tutor approval email - With Logging & Rate Limiting
   */
  async sendTutorApprovalEmail(tutorEmail, tutorName, tutorId) {
    // Prepare log data
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_approval',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: 'Welcome to Langoora – Your Tutor Account is Now Active',
      metadata: { tutorId, tutorName }
    };

    try {
      // ✅ Rate limiting check
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${tutorEmail}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      // Reload config for latest sender settings
      await this.loadConfig();

      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;
      const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tutor/dashboard`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Langoora - Tutor Account Approved</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #060d1f;
              margin: 0;
              padding: 0;
              color: #e0e0e0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
              background: #0a0e1a;
              border-radius: 16px;
              border: 1px solid #1e293b;
            }
            .header {
              text-align: center;
              padding-bottom: 30px;
              border-bottom: 1px solid #1e293b;
              margin-bottom: 30px;
            }
            .logo-wrapper {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              text-decoration: none;
            }
            .logo-icon {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #3b82f6, #06b6d4);
              border-radius: 10px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: 700;
              color: #ffffff;
              box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
            }
            .logo-text {
              font-size: 26px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: -0.5px;
            }
            .logo-text span {
              color: #60a5fa;
            }
            .subtitle {
              color: #64748b;
              margin: 6px 0 0 0;
              font-size: 12px;
              letter-spacing: 1px;
              font-weight: 400;
            }
            .content {
              padding: 0 10px;
            }
            .greeting {
              font-size: 24px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 16px;
            }
            .greeting span {
              color: #60a5fa;
            }
            .message {
              color: #94a3b8;
              line-height: 1.8;
              font-size: 15px;
              margin-bottom: 24px;
            }
            .message strong {
              color: #ffffff;
            }
            .success-box {
              background: #064e3b;
              border: 1px solid #34d399;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
              text-align: center;
            }
            .success-box h3 {
              color: #34d399;
              margin: 0 0 8px 0;
              font-size: 18px;
            }
            .success-box p {
              color: #6ee7b7;
              margin: 0;
              font-size: 14px;
            }
            .divider {
              border: none;
              height: 1px;
              background: linear-gradient(to right, transparent, #1e293b, transparent);
              margin: 30px 0;
            }
            .opportunities {
              margin: 24px 0;
            }
            .opportunities h4 {
              font-size: 13px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #60a5fa;
              margin-bottom: 16px;
              text-align: center;
            }
            .opportunity-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .opportunity-item {
              background: #0f1629;
              padding: 16px 14px;
              border-radius: 10px;
              border: 1px solid #1e293b;
              text-align: center;
            }
            .opportunity-item .icon {
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 8px auto;
              background: rgba(59, 130, 246, 0.15);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 8px;
              color: #60a5fa;
              font-size: 13px;
              font-weight: 700;
            }
            .opportunity-item .label {
              font-size: 12px;
              color: #94a3b8;
              font-weight: 500;
              line-height: 1.4;
            }
            .opportunity-item .label strong {
              color: #e0e0e0;
              display: block;
              font-weight: 600;
            }
            .button-group {
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin: 30px 0 24px 0;
            }
            .btn-primary {
              display: block;
              padding: 14px 32px;
              background: #3b82f6;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              transition: background 0.2s;
            }
            .btn-primary:hover {
              background: #2563eb;
            }
            .note {
              font-size: 13px;
              color: #64748b;
              text-align: center;
              margin: 16px 0 0 0;
              line-height: 1.6;
            }
            .note strong {
              color: #94a3b8;
            }
            .footer {
              margin-top: 30px;
              padding-top: 24px;
              border-top: 1px solid #1e293b;
              text-align: center;
              color: #64748b;
              font-size: 13px;
              line-height: 1.8;
            }
            .footer a {
              color: #60a5fa;
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
            .footer .copyright {
              font-size: 11px;
              color: #475569;
              margin-top: 8px;
            }
            @media (max-width: 480px) {
              .container { padding: 24px 16px; }
              .greeting { font-size: 20px; }
              .opportunity-grid { grid-template-columns: 1fr; }
              .logo-text { font-size: 22px; }
            }
          </style>
        </head>
        <body>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 20px 0;">
            <tr>
              <td align="center">
                <div class="container">
                  <!-- Header with Logo -->
                  <div class="header">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="logo-wrapper" style="text-decoration: none;">
                      <span class="logo-icon">L</span>
                      <span class="logo-text">Langoora<span>.</span></span>
                    </a>
                    <p class="subtitle">Precision CBTs for Language Mastery.</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <h1 class="greeting">Welcome aboard, <span>${tutorName}</span>!</h1>
                    
                    <p class="message">
                      We are pleased to inform you that your tutor application has been <strong>approved</strong>. 
                      Your qualifications have been verified, and you are now officially part of the Langoora 
                      tutor community.
                    </p>

                    <div class="success-box">
                      <h3>Account Activated</h3>
                      <p>Your tutor dashboard is now accessible.</p>
                    </div>

                    <hr class="divider">

                    <!-- Opportunities Section -->
                    <div class="opportunities">
                      <h4>What You Can Do Now</h4>
                      <div class="opportunity-grid">
                        <div class="opportunity-item">
                          <span class="icon">01</span>
                          <span class="label"><strong>Create Exam Packs</strong>Design and publish mock exams</span>
                        </div>
                        <div class="opportunity-item">
                          <span class="icon">02</span>
                          <span class="label"><strong>Earn Revenue</strong>Monetize your expertise</span>
                        </div>
                        <div class="opportunity-item">
                          <span class="icon">03</span>
                          <span class="label"><strong>Track Performance</strong>Monitor exam analytics</span>
                        </div>
                        <div class="opportunity-item">
                          <span class="icon">04</span>
                          <span class="label"><strong>View Reviews</strong>See student feedback</span>
                        </div>
                      </div>
                    </div>

                    <hr class="divider">

                    <!-- Action Buttons -->
                    <div class="button-group">
                      <a href="${loginLink}" class="btn-primary">Sign In to Your Account</a>
                    </div>

                    <p class="note">
                      <strong>Next Steps:</strong> Once signed in, start by creating your first exam pack and setting your pricing. 
                      Students are waiting to learn from your expertise.
                    </p>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <p>
                      This is an automated notification from Langoora.<br>
                      If you have any questions, please contact our support team at 
                      <a href="mailto:support@langoora.com">support@langoora.com</a>
                    </p>
                    <p class="copyright">
                      &copy; 2026 Langoora. All rights reserved.
                    </p>
                  </div>
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
      
      // ✅ Log success
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Approval email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      // ✅ Log failure
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
    // Prepare log data
    const logData = {
      recipient: tutorEmail,
      type: 'tutor_rejection',
      senderEmail: this.getSenderEmail(),
      senderName: this.getSenderName(),
      subject: 'Langoora – Update on Your Tutor Application',
      metadata: { tutorName, rejectionReason }
    };

    try {
      // ✅ Rate limiting check
      const rateCheck = await emailRateLimitService.canSend(tutorEmail);
      if (!rateCheck.allowed) {
        logData.status = 'failed';
        logData.error = rateCheck.reason;
        await emailLogService.logEmail(logData);
        console.log(`❌ Rate limit exceeded for ${tutorEmail}: ${rateCheck.reason}`);
        return { success: false, error: rateCheck.reason };
      }

      await this.ensureInitialized();

      // Reload config for latest sender settings
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
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #060d1f;
              margin: 0;
              padding: 0;
              color: #e0e0e0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
              background: #0a0e1a;
              border-radius: 16px;
              border: 1px solid #1e293b;
            }
            .header {
              text-align: center;
              padding-bottom: 30px;
              border-bottom: 1px solid #1e293b;
              margin-bottom: 30px;
            }
            .logo-wrapper {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              text-decoration: none;
            }
            .logo-icon {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #3b82f6, #06b6d4);
              border-radius: 10px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: 700;
              color: #ffffff;
              box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
            }
            .logo-text {
              font-size: 26px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: -0.5px;
            }
            .logo-text span {
              color: #60a5fa;
            }
            .subtitle {
              color: #64748b;
              margin: 6px 0 0 0;
              font-size: 12px;
              letter-spacing: 1px;
              font-weight: 400;
            }
            .content {
              padding: 0 10px;
            }
            .greeting {
              font-size: 24px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 16px;
            }
            .greeting span {
              color: #f87171;
            }
            .message {
              color: #94a3b8;
              line-height: 1.8;
              font-size: 15px;
              margin-bottom: 20px;
            }
            .message strong {
              color: #ffffff;
            }
            .rejection-box {
              background: #450a0a;
              border: 1px solid #f87171;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            .rejection-box h3 {
              color: #f87171;
              margin: 0 0 12px 0;
              font-size: 18px;
              text-align: center;
            }
            .reason-label {
              font-size: 11px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 6px;
              display: block;
            }
            .reason-text {
              background: #1a0a0a;
              padding: 14px 16px;
              border-radius: 8px;
              color: #fca5a5;
              font-size: 14px;
              border-left: 3px solid #f87171;
              line-height: 1.6;
              margin: 0;
            }
            .divider {
              border: none;
              height: 1px;
              background: linear-gradient(to right, transparent, #1e293b, transparent);
              margin: 30px 0;
            }
            .help-box {
              background: #1e293b;
              padding: 16px 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 3px solid #60a5fa;
            }
            .help-box h4 {
              color: #60a5fa;
              margin: 0 0 6px 0;
              font-size: 14px;
            }
            .help-box p {
              color: #94a3b8;
              font-size: 14px;
              margin: 0;
              line-height: 1.6;
            }
            .help-box a {
              color: #60a5fa;
              text-decoration: none;
            }
            .help-box a:hover {
              text-decoration: underline;
            }
            .button-group {
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin: 24px 0;
            }
            .btn-primary {
              display: block;
              padding: 14px 32px;
              background: #3b82f6;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              transition: background 0.2s;
            }
            .btn-primary:hover {
              background: #2563eb;
            }
            .btn-secondary {
              display: block;
              padding: 14px 32px;
              background: transparent;
              color: #94a3b8 !important;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 500;
              font-size: 15px;
              text-align: center;
              border: 1px solid #334155;
              transition: all 0.2s;
            }
            .btn-secondary:hover {
              background: #1e293b;
              color: #e0e0e0 !important;
            }
            .footer {
              margin-top: 30px;
              padding-top: 24px;
              border-top: 1px solid #1e293b;
              text-align: center;
              color: #64748b;
              font-size: 13px;
              line-height: 1.8;
            }
            .footer a {
              color: #60a5fa;
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
            .footer .copyright {
              font-size: 11px;
              color: #475569;
              margin-top: 8px;
            }
            @media (max-width: 480px) {
              .container { padding: 24px 16px; }
              .greeting { font-size: 20px; }
              .logo-text { font-size: 22px; }
            }
          </style>
        </head>
        <body>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 20px 0;">
            <tr>
              <td align="center">
                <div class="container">
                  <!-- Header with Logo -->
                  <div class="header">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="logo-wrapper" style="text-decoration: none;">
                      <span class="logo-icon">L</span>
                      <span class="logo-text">Langoora<span>.</span></span>
                    </a>
                    <p class="subtitle">Precision CBTs for Language Mastery.</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <h1 class="greeting">Hello <span>${tutorName}</span></h1>
                    
                    <p class="message">
                      We have carefully reviewed your tutor application. After thorough evaluation of your 
                      submitted qualifications and credentials, we regret to inform you that your application 
                      has been <strong style="color: #f87171;">declined</strong> at this time.
                    </p>

                    <div class="rejection-box">
                      <h3>Application Status: Declined</h3>
                      <span class="reason-label">Reason for Decision</span>
                      <p class="reason-text">${reason}</p>
                    </div>

                    <p class="message" style="font-size: 14px; color: #94a3b8;">
                      We encourage you to review our tutor requirements and consider reapplying in the future 
                      with additional qualifications or updated credentials.
                    </p>

                    <hr class="divider">

                    <div class="help-box">
                      <h4>Need Clarification?</h4>
                      <p>
                        If you believe this decision was made in error or need further clarification about the 
                        requirements, please don't hesitate to contact our support team at 
                        <a href="mailto:${supportEmail}">${supportEmail}</a>
                      </p>
                    </div>

                    <div class="button-group">
                      <a href="${signupLink}" class="btn-primary">Reapply as Tutor</a>
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn-secondary">Return to Langoora</a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <p>
                      This is an automated notification from Langoora.<br>
                      For any queries, please contact us at 
                      <a href="mailto:${supportEmail}">${supportEmail}</a>
                    </p>
                    <p class="copyright">
                      &copy; 2026 Langoora. All rights reserved.
                    </p>
                  </div>
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
      
      // ✅ Log success
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Rejection email sent to ${tutorEmail}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      // ✅ Log failure
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
    // Prepare log data
    const logData = {
      recipient: to,
      type: 'test',
      senderEmail: senderEmail || this.getSenderEmail(),
      senderName: senderName || this.getSenderName(),
      subject: 'Langoora – Email Configuration Test'
    };

    try {
      // ✅ Rate limiting check
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
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #060d1f;
              margin: 0;
              padding: 0;
              color: #e0e0e0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
              background: #0a0e1a;
              border-radius: 16px;
              border: 1px solid #1e293b;
            }
            .header {
              text-align: center;
              padding-bottom: 30px;
              border-bottom: 1px solid #1e293b;
              margin-bottom: 30px;
            }
            .logo-wrapper {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              text-decoration: none;
            }
            .logo-icon {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #3b82f6, #06b6d4);
              border-radius: 10px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: 700;
              color: #ffffff;
              box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
            }
            .logo-text {
              font-size: 26px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: -0.5px;
            }
            .logo-text span {
              color: #60a5fa;
            }
            .subtitle {
              color: #64748b;
              margin: 6px 0 0 0;
              font-size: 12px;
              letter-spacing: 1px;
              font-weight: 400;
            }
            .content {
              padding: 0 10px;
              text-align: center;
            }
            .success-icon {
              width: 56px;
              height: 56px;
              margin: 0 auto 16px auto;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(52, 211, 153, 0.15);
              border: 1px solid rgba(52, 211, 153, 0.35);
              border-radius: 14px;
              color: #34d399;
              font-size: 24px;
              font-weight: 700;
            }
            h2 {
              color: #34d399;
              font-size: 22px;
              margin-bottom: 12px;
            }
            p {
              color: #94a3b8;
              line-height: 1.8;
              font-size: 15px;
              margin-bottom: 8px;
            }
            .details {
              background: #0f1629;
              border: 1px solid #1e293b;
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
              text-align: left;
            }
            .details .row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 14px;
            }
            .details .row .label {
              color: #64748b;
            }
            .details .row .value {
              color: #e0e0e0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 24px;
              border-top: 1px solid #1e293b;
              text-align: center;
              color: #64748b;
              font-size: 13px;
              line-height: 1.8;
            }
            .footer a {
              color: #60a5fa;
              text-decoration: none;
            }
            .footer .copyright {
              font-size: 11px;
              color: #475569;
              margin-top: 8px;
            }
            @media (max-width: 480px) {
              .container { padding: 24px 16px; }
            }
          </style>
        </head>
        <body>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060d1f; padding: 20px 0;">
            <tr>
              <td align="center">
                <div class="container">
                  <div class="header">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="logo-wrapper" style="text-decoration: none;">
                      <span class="logo-icon">L</span>
                      <span class="logo-text">Langoora<span>.</span></span>
                    </a>
                    <p class="subtitle">Precision CBTs for Language Mastery.</p>
                  </div>
                  <div class="content">
                    <div class="success-icon">OK</div>
                    <h2>Email Configuration Test</h2>
                    <p>If you are reading this email, your email settings are configured correctly!</p>
                    <div class="details">
                      <div class="row">
                        <span class="label">Sender Name</span>
                        <span class="value">${fromName}</span>
                      </div>
                      <div class="row">
                        <span class="label">Sender Email</span>
                        <span class="value">${fromEmail}</span>
                      </div>
                      <div class="row">
                        <span class="label">Sent To</span>
                        <span class="value">${to}</span>
                      </div>
                      <div class="row">
                        <span class="label">Time</span>
                        <span class="value">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}</span>
                      </div>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">This is an automated test email from Langoora.</p>
                  </div>
                  <div class="footer">
                    <p>&copy; 2026 Langoora. All rights reserved.</p>
                  </div>
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
      
      // ✅ Log success
      logData.status = 'sent';
      logData.messageId = result.messageId;
      await emailLogService.logEmail(logData);
      
      console.log(`✅ Test email sent to ${to}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      // ✅ Log failure
      logData.status = 'failed';
      logData.error = error.message;
      await emailLogService.logEmail(logData);
      
      console.error('❌ Failed to send test email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();