// ============================================================
// utils/emailService.js — All email sending functions
// ============================================================
const transporter = require('../config/email');

const FROM = process.env.EMAIL_FROM || 'noreply@courseplatform.com';
const PLATFORM_NAME = 'Whatnext';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Base HTML template ────────────────────────────────────────
const baseTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .header p  { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 40px; color: #374151; line-height: 1.7; }
    .body h2 { font-size: 20px; color: #111827; margin-top: 0; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .info-box { background: #f8fafc; border-left: 4px solid #667eea; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .info-box strong { color: #111827; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 ${PLATFORM_NAME}</h1>
      <p>Your Learning Journey Starts Here</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.</p>
      <p>You're receiving this because you have an account on ${PLATFORM_NAME}.</p>
    </div>
  </div>
</body>
</html>
`;

// ── 1. Welcome Email ──────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const html = baseTemplate('Welcome to ' + PLATFORM_NAME, `
    <h2>Welcome aboard, ${user.name}! 🎉</h2>
    <p>Thank you for joining <strong>${PLATFORM_NAME}</strong>. Your account has been created successfully.</p>
    <p>Start exploring our courses and level up your skills today.</p>
    <div style="text-align:center;">
      <a class="btn" href="${CLIENT_URL}/courses">Browse Courses</a>
    </div>
    <div class="divider"></div>
    <div class="info-box">
      <p><strong>📧 Email:</strong> ${user.email}</p>
      <p><strong>👤 Role:</strong> ${user.role}</p>
    </div>
  `);

  return transporter.sendMail({
    from: `${PLATFORM_NAME} <${FROM}>`,
    to: user.email,
    subject: `Welcome to ${PLATFORM_NAME}! 🎓`,
    html
  });
};

// ── 2. Purchase Confirmation ──────────────────────────────────
const sendPurchaseConfirmation = async (user, item, payment) => {
  const html = baseTemplate('Purchase Confirmed', `
    <h2>Payment Successful! 🎉</h2>
    <p>Hi <strong>${user.name}</strong>, your purchase has been confirmed.</p>
    <div class="info-box">
      <p><strong>📦 Item:</strong> ${item.title}</p>
      <p><strong>💰 Amount Paid:</strong> ₹${payment.amountInRupees}</p>
      <p><strong>🧾 Order ID:</strong> ${payment.razorpayOrderId}</p>
      <p><strong>💳 Payment ID:</strong> ${payment.razorpayPaymentId}</p>
      <p><strong>📅 Date:</strong> ${new Date(payment.paidAt).toLocaleString('en-IN')}</p>
    </div>
    <div style="text-align:center;">
      <a class="btn" href="${CLIENT_URL}/dashboard">Go to Dashboard</a>
    </div>
  `);

  return transporter.sendMail({
    from: `${PLATFORM_NAME} <${FROM}>`,
    to: user.email,
    subject: `Purchase Confirmed: ${item.title}`,
    html
  });
};

// ── 3. Live Class URL ─────────────────────────────────────────
const sendLiveClassUrl = async (user, liveClass) => {
  const formattedDate = new Date(liveClass.scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const html = baseTemplate('Your Live Class Link', `
    <h2>Your Live Class is Starting Soon! 🔴</h2>
    <p>Hi <strong>${user.name}</strong>, here are the details for your upcoming live session.</p>
    <div class="info-box">
      <p><strong>📚 Session:</strong> ${liveClass.title}</p>
      <p><strong>📅 Date & Time:</strong> ${formattedDate}</p>
      <p><strong>⏱ Duration:</strong> ~${liveClass.duration} minutes</p>
      <p><strong>🎙 Platform:</strong> ${liveClass.platform}</p>
      ${liveClass.meetingId ? `<p><strong>🆔 Meeting ID:</strong> ${liveClass.meetingId}</p>` : ''}
      ${liveClass.meetingPassword ? `<p><strong>🔑 Password:</strong> ${liveClass.meetingPassword}</p>` : ''}
    </div>
    <div style="text-align:center;">
      <a class="btn" href="${liveClass.meetingUrl}">Join Live Class →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;">If the button doesn't work, copy this link:<br>
      <a href="${liveClass.meetingUrl}" style="color:#667eea;">${liveClass.meetingUrl}</a>
    </p>
  `);

  return transporter.sendMail({
    from: `${PLATFORM_NAME} <${FROM}>`,
    to: user.email,
    subject: `🔴 Live Class Link: ${liveClass.title}`,
    html
  });
};

// ── 4. Live Class Registration Confirmation ───────────────────
const sendRegistrationConfirmation = async (user, liveClass) => {
  const formattedDate = new Date(liveClass.scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const html = baseTemplate('Registration Confirmed', `
    <h2>You're registered! ✅</h2>
    <p>Hi <strong>${user.name}</strong>, your registration for the live class has been confirmed.</p>
    <div class="info-box">
      <p><strong>📚 Session:</strong> ${liveClass.title}</p>
      <p><strong>📅 Scheduled At:</strong> ${formattedDate}</p>
      <p><strong>⏱ Duration:</strong> ~${liveClass.duration} minutes</p>
    </div>
    <p>You'll receive the meeting link <strong>${liveClass.urlSendMinutesBefore} minutes</strong> before the class starts.</p>
    <div style="text-align:center;">
      <a class="btn" href="${CLIENT_URL}/dashboard/live-classes">View My Classes</a>
    </div>
  `);

  return transporter.sendMail({
    from: `${PLATFORM_NAME} <${FROM}>`,
    to: user.email,
    subject: `Registered: ${liveClass.title}`,
    html
  });
};

// ── 5. Password Reset ─────────────────────────────────────────
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;

  const html = baseTemplate('Reset Your Password', `
    <h2>Password Reset Request</h2>
    <p>Hi <strong>${user.name}</strong>, we received a request to reset your password.</p>
    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center;">
      <a class="btn" href="${resetUrl}">Reset Password</a>
    </div>
    <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  `);

  return transporter.sendMail({
    from: `${PLATFORM_NAME} <${FROM}>`,
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
};

// ── 6. Bulk Live Class URL (Admin triggered) ──────────────────
const sendBulkLiveClassUrls = async (liveClass, users) => {
  const promises = users.map(user => sendLiveClassUrl(user, liveClass));
  const results = await Promise.allSettled(promises);
  const failed = results.filter(r => r.status === 'rejected').length;
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  return { succeeded, failed, total: users.length };
};

module.exports = {
  sendWelcomeEmail,
  sendPurchaseConfirmation,
  sendLiveClassUrl,
  sendRegistrationConfirmation,
  sendPasswordResetEmail,
  sendBulkLiveClassUrls
};