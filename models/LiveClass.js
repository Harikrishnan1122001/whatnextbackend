// // ============================================================
// // models/LiveClass.js
// // ============================================================
// const mongoose = require('mongoose');

// const registrationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   registeredAt: { type: Date, default: Date.now },
//   urlSent: { type: Boolean, default: false },
//   urlSentAt: { type: Date, default: null },
//   attended: { type: Boolean, default: false },
//   paymentId: String,
//   amountPaid: { type: Number, default: 0 }
// }, { _id: true });

// const liveClassSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: [true, 'Live class title is required'],
//     trim: true
//   },
//   description: { type: String, trim: true },
//   instructor: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   scheduledAt: {
//     type: Date,
//     required: [true, 'Schedule date/time is required']
//   },
//   duration: { type: Number, default: 60 },  // minutes
//   // Zoom / Google Meet / etc.
//   meetingUrl: { type: String, default: null },
//   meetingId: { type: String, default: null },
//   meetingPassword: { type: String, default: null },
//   platform: {
//     type: String,
//     enum: ['zoom', 'google_meet', 'teams', 'youtube_live', 'other'],
//     default: 'zoom'
//   },
//   // Pricing (0 = free)
//   price: { type: Number, default: 0 },
//   currency: { type: String, default: 'INR' },
//   isFree: { type: Boolean, default: true },
//   // Capacity
//   maxParticipants: { type: Number, default: 100 },
//   // Registrations
//   registrations: [registrationSchema],
//   // Status
//   status: {
//     type: String,
//     enum: ['upcoming', 'live', 'completed', 'cancelled'],
//     default: 'upcoming'
//   },
//   // Auto-send URL X minutes before class
//   urlSendMinutesBefore: { type: Number, default: 30 },
//   urlSent: { type: Boolean, default: false },
//   thumbnail: { type: String, default: null },
//   recordingUrl: { type: String, default: null },
//   tags: [String],
//   course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }
// }, {
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // ── Virtuals ─────────────────────────────────────────────────
// liveClassSchema.virtual('registrationCount').get(function () {
//   return this.registrations.length;
// });

// liveClassSchema.virtual('availableSeats').get(function () {
//   return Math.max(0, this.maxParticipants - this.registrations.length);
// });

// liveClassSchema.virtual('isFull').get(function () {
//   return this.registrations.length >= this.maxParticipants;
// });

// // ── Indexes ──────────────────────────────────────────────────
// liveClassSchema.index({ scheduledAt: 1, status: 1 });

// module.exports = mongoose.model('LiveClass', liveClassSchema);


// models/LiveClass.js — FIXED
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registeredAt: { type: Date, default: Date.now },
  urlSent: { type: Boolean, default: false },
  urlSentAt: { type: Date, default: null },
  attended: { type: Boolean, default: false },
  paymentId: String,
  amountPaid: { type: Number, default: 0 }
}, { _id: true });

const liveClassSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Live class title is required'], trim: true },
  description: { type: String, trim: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: [true, 'Schedule date/time is required'] },
  duration: { type: Number, default: 60 },
  meetingUrl: { type: String, default: null },
  meetingId: { type: String, default: null },
  meetingPassword: { type: String, default: null },
  platform: {
    type: String,
    enum: ['zoom', 'google_meet', 'teams', 'youtube_live', 'other'],
    default: 'zoom'
  },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  isFree: { type: Boolean, default: true },
  maxParticipants: { type: Number, default: 100 },
  // ── FIX: default to [] so virtuals never crash ──
  registrations: { type: [registrationSchema], default: [] },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  urlSendMinutesBefore: { type: Number, default: 30 },
  urlSent: { type: Boolean, default: false },
  thumbnail: { type: String, default: null },
  recordingUrl: { type: String, default: null },
  tags: [String],
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── VIRTUALS — always guard with ?. and ?? 0 ──
liveClassSchema.virtual('registrationCount').get(function () {
  return this.registrations?.length ?? 0;
});

liveClassSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.maxParticipants - (this.registrations?.length ?? 0));
});

liveClassSchema.virtual('isFull').get(function () {
  return (this.registrations?.length ?? 0) >= this.maxParticipants;
});

liveClassSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);