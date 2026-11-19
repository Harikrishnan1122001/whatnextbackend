// ============================================================
// routes/uploadRoutes.js
// ============================================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, getImage, deleteImage } = require('../controllers/uploadController');

// Kept in memory (then saved to MongoDB). 4 MB cap — Vercel rejects
// request bodies over ~4.5 MB anyway.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
  },
});

const handleUpload = (req, res, next) =>
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 4 MB).' : err.message;
    return res.status(400).json({ success: false, message });
  });

router.get('/:id', getImage);                                   // public
router.post('/', protect, adminOnly, handleUpload, uploadImage); // admin
router.delete('/:id', protect, adminOnly, deleteImage);          // admin

module.exports = router;
