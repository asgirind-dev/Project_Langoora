// backend/utils/subscriptionCron.js
const cron = require('node-cron');
const { db } = require('../config/firebase');
const { sendEmail } = require('./emailService'); // ඔයාගේ Email Utility එක (හෝ Nodemailer transporter එක)

const checkExpiringSubscriptions = async () => {
  console.log('🔍 Checking for expiring subscriptions (2 days remaining)...');

  try {
    const today = new Date();
    
    // අද සිට හරියටම දවස් 2කට පසු දිනය calculation කිරීම
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2);
    
    // YYYY-MM-DD format එකට සකස් කිරීම
    const targetDateString = targetDate.toISOString().split('T')[0];

    // active subscriptions query කිරීම
    const snapshot = await db.collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    if (snapshot.empty) {
      console.log('✅ No expiring subscriptions found today.');
      return;
    }

    snapshot.forEach(async (doc) => {
      const sub = doc.data();
      
      // expiryDate / endDate එක පරික්ෂා කිරීම
      if (!sub.expiryDate) return;

      const subExpiryDateString = new Date(sub.expiryDate).toISOString().split('T')[0];

      // දවස් 2කට පසු expire වෙනවාද සහ දැනටමත් මේ සඳහා reminder එකක් යවා නැද්දැයි බලයි
      if (subExpiryDateString === targetDateString && !sub.reminderSent) {
        const studentId = sub.userId || sub.student_id;
        const planName = sub.planName || 'Subscription Plan';

        // 1. Student ගේ email එක database එකෙන් ලබාගැනීම
        const userDoc = await db.collection('users').doc(studentId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const studentEmail = userData?.email;

        // 2. 🔔 In-App Notification එකක් එකතු කිරීම
        await db.collection('notifications').add({
          userId: studentId,
          type: 'subscription_expiry',
          title: 'Subscription Expiring Soon! ⚠️',
          message: `Your ${planName} will expire in 2 days. Would you like to renew it now to keep your access?`,
          actionUrl: '/student/subscriptions', // Renew කරන්න යන path එක
          read: false,
          createdAt: new Date().toISOString()
        });

        // 3. 📧 Email එකක් යැවීම
        if (studentEmail) {
          const emailSubject = `Reminder: Your ${planName} expires in 2 days! ⏳`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #f39c12;">Subscription Expiry Notice</h2>
              <p>Hi ${userData?.name || 'Student'},</p>
              <p>Your subscription plan <strong>${planName}</strong> is set to expire in <strong>2 days</strong>.</p>
              <p>To continue enjoying uninterrupted access to all exams and features, would you like to renew your subscription plan?</p>
              <br/>
              <a href="http://localhost:3000/student/subscriptions" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Renew Subscription Now</a>
              <br/><br/>
              <p>Thank you,<br/>Team Langoora</p>
            </div>
          `;

          await sendEmail(studentEmail, emailSubject, emailHtml);
        }

        // 4. නැවත නැවත email නොයෑමට database එකේ reminderSent flag එක update කිරීම
        await doc.ref.update({ reminderSent: true });

        console.log(`✅ Expiry notification & email sent to user: ${studentId}`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
  }
};

// ⏰ සෑම දිනකම පෙ.ව. 08:00 ට මේ cron job එක otomatis run වේ
const initSubscriptionCron = () => {
  cron.schedule('0 8 * * *', () => {
    checkExpiringSubscriptions();
  });
  console.log('⏰ Subscription Expiry Cron Job Initialized.');
};

module.exports = { initSubscriptionCron, checkExpiringSubscriptions };