// ============================================================
// middleware/upload.js — Multer file upload configs
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Ensure upload directories exist ──────────────────────────
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');
['videos', 'documents', 'thumbnails', 'avatars'].forEach(sub =>
  ensureDir(path.join(UPLOAD_BASE, sub))
);

// ── Helper: generate unique filename ─────────────────────────
const uniqueFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  return `${uuidv4()}${ext}`;
};

// ── Storage: Videos ──────────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'videos')),
  filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
});

// ── Storage: Documents (PDF, DOCX, PPT, etc.) ────────────────
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'documents')),
  filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
});

// ── Storage: Images / Thumbnails ─────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.uploadSubDir || 'thumbnails';
    ensureDir(path.join(UPLOAD_BASE, subDir));
    cb(null, path.join(UPLOAD_BASE, subDir));
  },
  filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
});

// ── File Filters ──────────────────────────────────────────────
const videoFilter = (req, file, cb) => {
  const allowed = /mp4|mkv|avi|mov|webm|flv/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error('Only video files (mp4, mkv, avi, mov, webm, flv) are allowed.'));
};

const documentFilter = (req, file, cb) => {
  const allowed = /pdf|docx|doc|ppt|pptx|xlsx|xls/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error('Only document files (pdf, docx, ppt, xlsx) are allowed.'));
};

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
};

// ── Multer instances ──────────────────────────────────────────
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DOC_SIZE   =  50 * 1024 * 1024; //  50 MB
const MAX_IMG_SIZE   =   5 * 1024 * 1024; //   5 MB

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: MAX_VIDEO_SIZE }
});

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: MAX_DOC_SIZE }
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMG_SIZE }
});

// ── Multer error handler ──────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ── Helper: get public URL from file path ─────────────────────
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  const relative = filePath.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/');
  return relative.startsWith('/') ? relative : `/${relative}`;
};

module.exports = {
  uploadVideo,
  uploadDocument,
  uploadImage,
  handleMulterError,
  getFileUrl
};