// ============================================================
// controllers/uploadController.js — course / blog image uploads
// ============================================================
const mongoose = require('mongoose');
const Image = require('../models/Image');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// Public base URL used to build the absolute image link that gets
// saved on the course. Set PUBLIC_API_URL in Vercel to be explicit,
// e.g. https://whatnextbackendadmin.vercel.app
const baseUrl = (req) =>
  (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// POST /api/uploads   (admin) — multipart field name: "image"
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Please choose an image file.', 400);

  const image = await Image.create({
    data: req.file.buffer,
    contentType: req.file.mimetype,
    size: req.file.size,
    originalName: req.file.originalname,
    uploadedBy: req.user ? req.user._id : null,
  });

  // The frontend reads `data.url` and saves it as the course thumbnail.
  return res.status(201).json({
    success: true,
    message: 'Image uploaded',
    id: image._id,
    url: `${baseUrl(req)}/api/uploads/${image._id}`,
  });
});

// GET /api/uploads/:id   (public) — serves the image bytes
exports.getImage = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Image not found', 404);

  const image = await Image.findById(req.params.id);
  if (!image) throw new AppError('Image not found', 404);

  res.set({
    'Content-Type': image.contentType,
    'Content-Length': image.size,
    // Images never change once uploaded, so browsers/CDN can cache for a year.
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  return res.send(image.data);
});

// DELETE /api/uploads/:id   (admin)
exports.deleteImage = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Image not found', 404);
  const image = await Image.findByIdAndDelete(req.params.id);
  if (!image) throw new AppError('Image not found', 404);
  return res.json({ success: true, message: 'Image deleted' });
});
