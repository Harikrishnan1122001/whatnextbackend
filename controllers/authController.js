// ============================================================
// controllers/authController.js
// ============================================================
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');

// ── POST /api/auth/register ───────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Prevent self-promotion to admin via API
  const assignedRole = role === 'admin' ? 'student' : (role || 'student');

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 400);

  const user = await User.create({ name, email, password, role: assignedRole, phone });

  // Send welcome email (non-blocking)
  sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err.message));

  const token = user.generateJWT();
  return sendSuccess(res, {
    token,
    user: {
      id: user._id, name: user.name, email: user.email,
      role: user.role, phone: user.phone
    }
  }, 'Registration successful', 201);
});
exports.createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
 
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 400);
 
  const user = await User.create({
    name, email, password, role: 'admin', 
  });
 
  // Generate token so new admin can login immediately
  const token = user.generateJWT();
 
  return sendSuccess(res, {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  }, 'Admin account created', 201);
});
// ── POST /api/auth/login ──────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 403);
  }

  const token = user.generateJWT();

  return sendSuccess(
    res,
    {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    "Login successful"
  );
});

// ── GET /api/auth/me ──────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('purchasedCourses.course', 'title thumbnail')
    .populate('purchasedNotes.notes', 'title fileType')
    .populate('liveClassRegistrations.liveClass', 'title scheduledAt status');

  return sendSuccess(res, { user });
});

// ── PUT /api/auth/profile ─────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (req.file) updates.avatar = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true, runValidators: true
  });

  return sendSuccess(res, { user }, 'Profile updated');
});

// ── PUT /api/auth/change-password ─────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }
  if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400);

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, {}, 'Password changed successfully');
});

// ── POST /api/auth/forgot-password ───────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new AppError('No account with that email', 404);

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user, resetToken);
    return sendSuccess(res, {}, 'Password reset email sent');
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Email could not be sent', 500);
  }
});

// ── POST /api/auth/reset-password/:token ─────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = user.generateJWT();
  return sendSuccess(res, { token }, 'Password reset successful');
});

// ── POST /api/auth/admin-register ────────────────────────────
// Only callable by existing admins
exports.createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 400);

  const user = await User.create({
    name, email, password, role: 'admin', phone
  });

  return sendSuccess(res, {
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  }, 'Admin account created', 201);
});