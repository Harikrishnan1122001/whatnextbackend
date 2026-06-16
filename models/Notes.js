// ============================================================
// models/Notes.js — Course notes / documents for purchase
// ============================================================
const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notes title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: { type: String, trim: true },
  // The uploaded PDF / DOCX path
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'docx', 'ppt', 'xlsx', 'other'], default: 'pdf' },
  fileSizeBytes: { type: Number, default: 0 },
  // Preview: first N pages visible for free
  previewPages: { type: Number, default: 0 },
  previewFileUrl: { type: String, default: null },
  thumbnail: { type: String, default: null },
  // Pricing
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, default: null },
  currency: { type: String, default: 'INR' },
  isFree: { type: Boolean, default: false },
  // Relations
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Status
  isPublished: { type: Boolean, default: true },
  // Stats
  totalPurchases: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  tags: [String],
  category: { type: String, trim: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notesSchema.virtual('effectivePrice').get(function () {
  if (this.isFree) return 0;
  return this.discountPrice !== null ? this.discountPrice : this.price;
});

notesSchema.index({ title: 'text', description: 'text' });
notesSchema.index({ course: 1 });
notesSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Notes', notesSchema);