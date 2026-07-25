// backend/scripts/createEmailControls.js
const { db } = require('../config/firebase');

async function createEmailControls() {
  try {
    console.log('🔧 Creating email_controls document...');
    
    const docRef = db.collection('system_settings').doc('email_controls');
    
    const data = {
      rateLimitPerHour: 100,
      rateLimitPerDay: 500,
      rateLimitPerMinute: 10,
      updatedAt: new Date().toISOString()
    };
    
    await docRef.set(data);
    
    console.log('✅ email_controls document created successfully!');
    console.log('   Rate Limits:');
    console.log(`     Per Minute: ${data.rateLimitPerMinute}`);
    console.log(`     Per Hour: ${data.rateLimitPerHour}`);
    console.log(`     Per Day: ${data.rateLimitPerDay}`);
    
  } catch (error) {
    console.error('❌ Failed to create email_controls:', error.message);
  }
}

createEmailControls();