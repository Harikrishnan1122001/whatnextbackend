// ============================================================
// models/User.js — Fixed pre-save hook
// ============================================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  purchasedCourses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    purchasedAt: { type: Date, default: Date.now },
    paymentId: String,
    amount: Number
  }],
  purchasedNotes: [{
    notes: { type: mongoose.Schema.Types.ObjectId, ref: 'Notes' },
    purchasedAt: { type: Date, default: Date.now },
    paymentId: String,
    amount: Number
  }],
  liveClassRegistrations: [{
    liveClass: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' },
    registeredAt: { type: Date, default: Date.now },
    urlSent: { type: Boolean, default: false }
  }],
  videoProgress: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    videoId: String,
    watchedSeconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatched: { type: Date, default: Date.now }
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String
}, {
  timestamps: true
});

// ── Pre-save: Hash password ──────────────────────────────────
// FIX: use async/await properly — DO NOT call next() with async pre-save
// In Mongoose 7+, returning a promise is enough — next() is not needed
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Methods ──────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.hasPurchasedCourse = function (courseId) {
  return this.purchasedCourses.some(p => p.course.toString() === courseId.toString());
};

userSchema.methods.hasPurchasedNotes = function (notesId) {
  return this.purchasedNotes.some(p => p.notes.toString() === notesId.toString());
};

userSchema.methods.isRegisteredForClass = function (liveClassId) {
  return this.liveClassRegistrations.some(
    r => r.liveClass.toString() === liveClassId.toString()
  );
};

// ── Virtual ──────────────────────────────────────────────────
userSchema.virtual('totalPurchases').get(function () {
  return this.purchasedCourses.length + this.purchasedNotes.length;
});

module.exports = mongoose.model('User', userSchema);