// ============================================================
// routes/authRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();

const {
  register, login, getMe, updateProfile,
  changePassword, forgotPassword, resetPassword, createAdmin
} = require('../controllers/authController');

const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, handleMulterError } = require('../middleware/upload');
const {
  validate, registerRules, loginRules
} = require('../middleware/validate');

// ── Public ────────────────────────────────────────────────────
router.post('/register',          registerRules, validate, register);
router.post('/admin-register', registerRules, validate, createAdmin);
router.post('/login',             loginRules, validate, login);
router.post('/forgot-password',   forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ── Protected ─────────────────────────────────────────────────
router.get('/me',             protect, getMe);
router.put('/profile',        protect, uploadImage.single('avatar'), handleMulterError, updateProfile);
router.put('/change-password', protect, changePassword);

// ── Admin only ────────────────────────────────────────────────
// router.post('/admin-register', protect,registerRules, validate, createAdmin);


module.exports = router;