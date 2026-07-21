// backend/scripts/testCompleteFlow.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const emailService = require('../services/emailService');

async function testCompleteFlow() {
  console.log('🔧 Testing complete email flow with Firestore config...\n');
  console.log('📋 Environment variables loaded:');
  console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ Missing'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ Missing'}`);
  console.log('');
  
  try {
    // Initialize email service (will load Firestore config)
    console.log('📧 Initializing email service...');
    await emailService.initialize();
    
    // Check loaded config
    console.log('✅ Email service initialized');
    console.log(`   Sender: ${emailService.getSenderInfo()}`);
    console.log(`   Config loaded from Firestore: ${emailService.config ? '✅ Yes' : '❌ No'}`);
    console.log('');
    
    // Test approval email
    console.log('📧 Sending test approval email...');
    const approvalResult = await emailService.sendTutorApprovalEmail(
      'asgirind186@gmail.com', // Your email
      'Test Tutor',
      'test123'
    );
    
    if (approvalResult.success) {
      console.log('✅ Approval email sent successfully!');
      console.log(`   Message ID: ${approvalResult.messageId}`);
    } else {
      console.log('❌ Approval email failed:', approvalResult.error);
    }
    console.log('');
    
    // Test rejection email
    console.log('📧 Sending test rejection email...');
    const rejectionResult = await emailService.sendTutorRejectionEmail(
      'asgirind186@gmail.com', // Your email
      'Test Tutor',
      'Your qualifications do not meet our minimum requirements for JLPT N1 certification.'
    );
    
    if (rejectionResult.success) {
      console.log('✅ Rejection email sent successfully!');
      console.log(`   Message ID: ${rejectionResult.messageId}`);
    } else {
      console.log('❌ Rejection email failed:', rejectionResult.error);
    }
    console.log('');
    
    console.log('✅ All tests complete!');
    console.log('📬 Check your Gmail inbox (and spam folder) for the test emails.');
    console.log(`   From: ${emailService.getSenderInfo()}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCompleteFlow();