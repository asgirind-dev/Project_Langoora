// backend/scripts/testEmailSystem.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const emailService = require('../services/emailService');
const emailLogService = require('../services/emailLogService');
const emailRateLimitService = require('../services/emailRateLimitService');

async function testEmailSystem() {
  console.log('\n🔧 =========================================');
  console.log('   EMAIL SYSTEM TEST');
  console.log('=========================================\n');

  // ============================================================
  // TEST 1: Email Service Initialization
  // ============================================================
  console.log('📧 Test 1: Email Service Initialization');
  console.log('----------------------------------------');
  try {
    const initResult = await emailService.initialize();
    console.log(`   Status: ${initResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Sender: ${emailService.getSenderInfo()}`);
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  // ============================================================
  // TEST 2: Rate Limiting Service
  // ============================================================
  console.log('🚦 Test 2: Rate Limiting Service');
  console.log('-------------------------------');
  try {
    const rateLimits = await emailRateLimitService.getRateLimits();
    console.log(`   Rate Limits:`);
    console.log(`     Per Minute: ${rateLimits.perMinute} emails`);
    console.log(`     Per Hour: ${rateLimits.perHour} emails`);
    console.log(`     Per Day: ${rateLimits.perDay} emails`);
    
    const rateStatus = await emailRateLimitService.getStatus();
    console.log(`   Current Usage:`);
    console.log(`     Minute: ${rateStatus?.current?.perMinute || 0} / ${rateLimits.perMinute}`);
    console.log(`     Hour: ${rateStatus?.current?.perHour || 0} / ${rateLimits.perHour}`);
    console.log(`     Day: ${rateStatus?.current?.perDay || 0} / ${rateLimits.perDay}`);
    console.log(`   Remaining:`);
    console.log(`     Minute: ${rateStatus?.remaining?.perMinute || 0}`);
    console.log(`     Hour: ${rateStatus?.remaining?.perHour || 0}`);
    console.log(`     Day: ${rateStatus?.remaining?.perDay || 0}`);
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  // ============================================================
  // TEST 3: Send Test Email (With Logging)
  // ============================================================
  console.log('📧 Test 3: Send Test Email (With Logging)');
  console.log('----------------------------------------');
  try {
    const testResult = await emailService.sendTestEmail(
      process.env.ADMIN_EMAIL || 'asgirind186@gmail.com',
      'asgirind186@gmail.com',
      'Langoora Test'
    );
    console.log(`   Status: ${testResult.success ? '✅ SENT' : '❌ FAILED'}`);
    if (testResult.success) {
      console.log(`   Message ID: ${testResult.messageId}`);
    } else {
      console.log(`   Error: ${testResult.error}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  // ============================================================
  // TEST 4: Check Email Logs
  // ============================================================
  console.log('📝 Test 4: Email Log Service');
  console.log('---------------------------');
  try {
    const logs = await emailLogService.getLogs(10);
    console.log(`   Recent Logs Found: ${logs.logs?.length || 0}`);
    if (logs.logs && logs.logs.length > 0) {
      console.log(`   Latest Log:`);
      const latest = logs.logs[0];
      console.log(`     Recipient: ${latest.recipient}`);
      console.log(`     Type: ${latest.type}`);
      console.log(`     Status: ${latest.status}`);
      console.log(`     Subject: ${latest.subject || 'N/A'}`);
      console.log(`     Sent At: ${latest.sentAt}`);
      if (latest.error) {
        console.log(`     Error: ${latest.error}`);
      }
    } else {
      console.log('   No logs found. Send a test email first.');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  // ============================================================
  // TEST 5: Email Analytics
  // ============================================================
  console.log('📊 Test 5: Email Analytics');
  console.log('-------------------------');
  try {
    const analytics = await emailLogService.getAnalytics('day');
    if (analytics.success) {
      console.log(`   Time Range: Day`);
      console.log(`   Total Emails: ${analytics.stats.total}`);
      console.log(`   Sent: ${analytics.stats.sent}`);
      console.log(`   Failed: ${analytics.stats.failed}`);
      console.log(`   Bounced: ${analytics.stats.bounced || 0}`);
      console.log(`   Success Rate: ${analytics.stats.successRate}%`);
      console.log(`   By Type:`);
      if (analytics.stats.byType && Object.keys(analytics.stats.byType).length > 0) {
        Object.entries(analytics.stats.byType).forEach(([type, count]) => {
          console.log(`     ${type}: ${count}`);
        });
      } else {
        console.log('     No email types recorded yet');
      }
      if (analytics.stats.recentFailures && analytics.stats.recentFailures.length > 0) {
        console.log(`   Recent Failures:`);
        analytics.stats.recentFailures.forEach((failure) => {
          console.log(`     ${failure.recipient}: ${failure.error}`);
        });
      }
    } else {
      console.log(`   ❌ Failed: ${analytics.error}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  // ============================================================
  // TEST 6: Rate Limit Check (Can Send?)
  // ============================================================
  console.log('🔍 Test 6: Rate Limit Check');
  console.log('--------------------------');
  try {
    const canSend = await emailRateLimitService.canSend('test@example.com');
    console.log(`   Can Send Email: ${canSend.allowed ? '✅ YES' : '❌ NO'}`);
    if (!canSend.allowed) {
      console.log(`   Reason: ${canSend.reason}`);
      console.log(`   Limit: ${canSend.limit}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log('');

  console.log('✅ =========================================');
  console.log('   EMAIL SYSTEM TEST COMPLETE');
  console.log('=========================================\n');
}

// Run the test
testEmailSystem().catch(console.error);