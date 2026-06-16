// ============================================================
// models/Payment.js — Fixed duplicate index warning
// ============================================================
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  itemType: {
    type: String,
    enum: ['course', 'notes', 'live_class'],
    required: true
  },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemRef' },
  itemRef: {
    type: String,
    enum: ['Course', 'Notes', 'LiveClass'],
    required: true
  },
  itemTitle: { type: String },

  amount: { type: Number, required: true },
  amountInRupees: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // FIX: removed "index: true" here — index defined below via schema.index() only
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },

  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded'],
    default: 'created'
  },
  paidAt: { type: Date, default: null },
  failureReason: { type: String, default: null },

  receipt: { type: String },
  notes: { type: Object, default: {} }
}, {
  timestamps: true
});

// ── Indexes ──────────────────────────────────────────────────
// NOTE: razorpayOrderId already has unique:true above, so NO schema.index() for it
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);