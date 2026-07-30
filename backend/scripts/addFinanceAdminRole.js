// backend/scripts/addFinanceAdminRole.js
const { db } = require('../config/firebase');

async function addFinanceAdminRole() {
  try {
    const docRef = db.collection('system_settings').doc('security_governance');
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Check if finance_admin exists
      if (data.sessionTimeouts && data.sessionTimeouts.finance_admin === undefined) {
        console.log('⚠️ "finance_admin" role not found. Adding...');
        
        // Add finance_admin with same value as finance
        const updatedTimeouts = {
          ...data.sessionTimeouts,
          finance_admin: data.sessionTimeouts.finance || 10
        };
        
        // Update the document
        await docRef.update({
          sessionTimeouts: updatedTimeouts,
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ "finance_admin" role successfully added');
        console.log('📊 New sessionTimeouts:', updatedTimeouts);
      } else {
        console.log('✅ "finance_admin" role already exists');
      }
    } else {
      console.log('⚠️ Security governance document not found.');
    }
  } catch (error) {
    console.error('❌ Error adding finance_admin role:', error);
  }
}

// Run the migration
addFinanceAdminRole();