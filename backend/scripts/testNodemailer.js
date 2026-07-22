// backend/scripts/testNodemailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testNodemailer() {
  console.log('🔧 Testing Nodemailer connection...');
  console.log(`   SMTP User: ${process.env.SMTP_USER}`);
  console.log(`   SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP Port: ${process.env.SMTP_PORT}`);
  console.log('');
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log(`   Connected as: ${process.env.SMTP_USER}`);
    
    // Send test email
    console.log('\n📧 Sending test email...');
    const info = await transporter.sendMail({
      from: `"Langoora Test" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: '✅ Nodemailer Test - Langoora',
      html: `
        <h2>✅ Nodemailer is Working!</h2>
        <p>This is a test email from your Langoora backend.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>SMTP User:</strong> ${process.env.SMTP_USER}</p>
        <p style="color: #666; font-size: 12px;">If you received this, your email configuration is correct!</p>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${process.env.ADMIN_EMAIL || process.env.SMTP_USER}`);
    console.log('\n📬 Check your inbox (and spam folder) for the test email.');
    
  } catch (error) {
    console.error('❌ Nodemailer test failed:');
    console.error(`   Error: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if SMTP_PASS is an App Password (not Gmail password)');
    console.log('   2. Enable 2-Step Verification in Google Account');
    console.log('   3. Generate a new App Password if needed');
    console.log('   4. Check your internet connection');
  }
}

testNodemailer();