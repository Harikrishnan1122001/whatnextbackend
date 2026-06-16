// ============================================================
// utils/scheduler.js — Cron jobs (auto URL send before class)
// ============================================================
const cron = require('node-cron');
const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const { sendLiveClassUrl } = require('./emailService');

// ── Job: Check every minute for upcoming classes ─────────────
// Sends meeting URL to all registered users X minutes before class
const startScheduler = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find live classes that haven't had their URL sent,
      // where (scheduledAt - urlSendMinutesBefore) <= now <= scheduledAt
      const classes = await LiveClass.find({
        status: 'upcoming',
        urlSent: false,
        meetingUrl: { $ne: null },
        scheduledAt: { $gte: now }
      });

      for (const liveClass of classes) {
        const sendAt = new Date(liveClass.scheduledAt);
        sendAt.setMinutes(sendAt.getMinutes() - liveClass.urlSendMinutesBefore);

        if (now >= sendAt) {
          console.log(`📧 Sending URLs for live class: ${liveClass.title}`);

          // Get all registered user IDs that haven't been sent yet
          const pendingRegistrations = liveClass.registrations.filter(r => !r.urlSent);

          if (pendingRegistrations.length === 0) {
            await LiveClass.findByIdAndUpdate(liveClass._id, { urlSent: true });
            continue;
          }

          const userIds = pendingRegistrations.map(r => r.user);
          const users = await User.find({ _id: { $in: userIds }, isActive: true });

          let sentCount = 0;
          for (const user of users) {
            try {
              await sendLiveClassUrl(user, liveClass);
              // Mark this user's registration as URL sent
              await LiveClass.updateOne(
                { _id: liveClass._id, 'registrations.user': user._id },
                {
                  $set: {
                    'registrations.$.urlSent': true,
                    'registrations.$.urlSentAt': new Date()
                  }
                }
              );
              sentCount++;
            } catch (emailErr) {
              console.error(`Failed to send email to ${user.email}:`, emailErr.message);
            }
          }

          // Mark class as URL sent
          await LiveClass.findByIdAndUpdate(liveClass._id, { urlSent: true });
          console.log(`✅ Sent to ${sentCount}/${users.length} students for: ${liveClass.title}`);
        }
      }

      // ── Mark classes as 'live' when they start ──────────────
      await LiveClass.updateMany(
        {
          status: 'upcoming',
          scheduledAt: { $lte: now }
        },
        { $set: { status: 'live' } }
      );

      // ── Mark classes as 'completed' after duration ends ─────
      const completedThreshold = new Date(now);
      completedThreshold.setHours(completedThreshold.getHours() - 3); // max 3hr class

      const liveClasses = await LiveClass.find({ status: 'live' });
      for (const cls of liveClasses) {
        const endTime = new Date(cls.scheduledAt);
        endTime.setMinutes(endTime.getMinutes() + (cls.duration || 60));
        if (now >= endTime) {
          await LiveClass.findByIdAndUpdate(cls._id, { status: 'completed' });
        }
      }

    } catch (error) {
      console.error('Scheduler error:', error.message);
    }
  });

  console.log('⏰ Scheduler started — checking live classes every minute');
};

module.exports = { startScheduler };