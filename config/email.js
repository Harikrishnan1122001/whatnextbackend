// ============================================================
// config/email.js — Nodemailer transporter
// ============================================================
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// Verify transport connection at startup
transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  Email transport not ready:', error.message);
  } else {
    console.log('✅ Email transport ready');
  }
});

module.exports = transporter;