// ============================================================
// models/Image.js — images stored in MongoDB
// ------------------------------------------------------------
// Vercel's disk is temporary (files vanish between requests), so
// uploaded course/blog images are kept in the database instead.
// ============================================================
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  originalName: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Image', imageSchema);
