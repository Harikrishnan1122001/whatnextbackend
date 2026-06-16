const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  // Either a local file path OR an external URL
  videoUrl: { type: String, required: true },
  videoType: { type: String, enum: ['upload', 'url'], default: 'upload' },
  duration: { type: Number, default: 0 },  // seconds
  order: { type: Number, default: 0 },
  isPreview: { type: Boolean, default: false },   // free preview?
  // After how many seconds to show BuyNow (default 300 = 5 min)
  buyNowTriggerSeconds: { type: Number, default: 300 },
  thumbnail: { type: String, default: null },
  views: { type: Number, default: 0 }
}, { timestamps: true });
const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: { type: String, required: true, trim: true },
  shortDescription: { type: String, trim: true, maxlength: 500 },
  thumbnail: { type: String, default: null },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: { type: String, trim: true },
  tags: [String],
  // Pricing
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, default: null },
  currency: { type: String, default: 'INR' },
  isFree: { type: Boolean, default: false },
  // Videos
  videos: [videoSchema],
  // Status
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  // Stats (denormalized for fast reads)
  totalStudents: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  // Requirements & Outcomes
  requirements: [String],
  outcomes: [String],
  language: { type: String, default: 'English' },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  // Attached notes (sold separately)
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notes' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── Virtuals ────────────────────────────────────────────────
courseSchema.virtual('effectivePrice').get(function () {
  if (this.isFree) return 0;
  return this.discountPrice !== null ? this.discountPrice : this.price;
});

courseSchema.virtual('totalVideos').get(function () {
  return this.videos.length;
});

courseSchema.virtual('totalDuration').get(function () {
  return this.videos.reduce((sum, v) => sum + (v.duration || 0), 0);
});
// ── Indexes ──────────────────────────────────────────────────
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ isPublished: 1, category: 1 });
courseSchema.index({ price: 1 });

module.exports = mongoose.model('Course', courseSchema);