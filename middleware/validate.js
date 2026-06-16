// ============================================================
// middleware/validate.js — Request validation rules
// ============================================================
const { body, param, query, validationResult } = require('express-validator');

// ── Collect and return validation errors ─────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return res.status(422).json({
      success: false,
      message: messages[0],
      errors: errors.array()
    });
  }
  next();
};

// ── Auth validations ──────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'admin']).withMessage('Invalid role')
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// ── Course validations ────────────────────────────────────────
const courseRules = [
  body('title').trim().notEmpty().withMessage('Course title is required')
    .isLength({ max: 200 }).withMessage('Title too long'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isNumeric({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all'])
    .withMessage('Invalid level')
];

// ── Video validations ─────────────────────────────────────────
const videoUrlRules = [
  body('title').trim().notEmpty().withMessage('Video title is required'),
  body('videoUrl').trim().isURL().withMessage('Valid video URL is required')
];

// ── Live class validations ────────────────────────────────────
const liveClassRules = [
  body('title').trim().notEmpty().withMessage('Live class title is required'),
  body('scheduledAt').isISO8601().withMessage('Valid schedule date/time required'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive'),
  body('price').optional().isNumeric({ min: 0 }).withMessage('Price must be non-negative')
];

// ── Notes validations ─────────────────────────────────────────
const notesRules = [
  body('title').trim().notEmpty().withMessage('Notes title is required'),
  body('price').isNumeric({ min: 0 }).withMessage('Price must be a non-negative number')
];

// ── Payment validations ───────────────────────────────────────
const paymentVerifyRules = [
  body('razorpayOrderId').notEmpty().withMessage('Order ID required'),
  body('razorpayPaymentId').notEmpty().withMessage('Payment ID required'),
  body('razorpaySignature').notEmpty().withMessage('Signature required')
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  courseRules,
  videoUrlRules,
  liveClassRules,
  notesRules,
  paymentVerifyRules
};