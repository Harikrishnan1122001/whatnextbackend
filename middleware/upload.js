// // ============================================================
// // middleware/upload.js — Multer file upload configs
// // ============================================================
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');

// // ── Ensure upload directories exist ──────────────────────────
// const ensureDir = (dir) => {
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// };

// const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');
// ['videos', 'documents', 'thumbnails', 'avatars'].forEach(sub =>
//   ensureDir(path.join(UPLOAD_BASE, sub))
// );

// // ── Helper: generate unique filename ─────────────────────────
// const uniqueFilename = (originalName) => {
//   const ext = path.extname(originalName).toLowerCase();
//   return `${uuidv4()}${ext}`;
// };

// // ── Storage: Videos ──────────────────────────────────────────
// const videoStorage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'videos')),
//   filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
// });

// // ── Storage: Documents (PDF, DOCX, PPT, etc.) ────────────────
// const documentStorage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'documents')),
//   filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
// });

// // ── Storage: Images / Thumbnails ─────────────────────────────
// const imageStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const subDir = req.uploadSubDir || 'thumbnails';
//     ensureDir(path.join(UPLOAD_BASE, subDir));
//     cb(null, path.join(UPLOAD_BASE, subDir));
//   },
//   filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
// });

// // ── File Filters ──────────────────────────────────────────────
// const videoFilter = (req, file, cb) => {
//   const allowed = /mp4|mkv|avi|mov|webm|flv/;
//   const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
//   if (allowed.test(ext)) return cb(null, true);
//   cb(new Error('Only video files (mp4, mkv, avi, mov, webm, flv) are allowed.'));
// };

// const documentFilter = (req, file, cb) => {
//   const allowed = /pdf|docx|doc|ppt|pptx|xlsx|xls/;
//   const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
//   if (allowed.test(ext)) return cb(null, true);
//   cb(new Error('Only document files (pdf, docx, ppt, xlsx) are allowed.'));
// };

// const imageFilter = (req, file, cb) => {
//   const allowed = /jpeg|jpg|png|gif|webp/;
//   const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
//   if (allowed.test(ext)) return cb(null, true);
//   cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
// };

// // ── Multer instances ──────────────────────────────────────────
// const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
// const MAX_DOC_SIZE   =  50 * 1024 * 1024; //  50 MB
// const MAX_IMG_SIZE   =   5 * 1024 * 1024; //   5 MB

// const uploadVideo = multer({
//   storage: videoStorage,
//   fileFilter: videoFilter,
//   limits: { fileSize: MAX_VIDEO_SIZE }
// });

// const uploadDocument = multer({
//   storage: documentStorage,
//   fileFilter: documentFilter,
//   limits: { fileSize: MAX_DOC_SIZE }
// });

// const uploadImage = multer({
//   storage: imageStorage,
//   fileFilter: imageFilter,
//   limits: { fileSize: MAX_IMG_SIZE }
// });

// // ── Multer error handler ──────────────────────────────────────
// const handleMulterError = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ success: false, message: 'File too large.' });
//     }
//     return res.status(400).json({ success: false, message: err.message });
//   }
//   if (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
//   next();
// };

// // ── Helper: get public URL from file path ─────────────────────
// const getFileUrl = (filePath) => {
//   if (!filePath) return null;
//   const relative = filePath.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/');
//   return relative.startsWith('/') ? relative : `/${relative}`;
// };

// module.exports = {
//   uploadVideo,
//   uploadDocument,
//   uploadImage,
//   handleMulterError,
//   getFileUrl
// };

// ============================================================
// middleware/upload.js — Multer file upload configs
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ── Ensure upload directories exist ──────────────────────────
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// On Vercel, everything except /tmp is read-only at runtime, so
// writing into the deployed app folder (path.join(__dirname, '..', 'uploads'))
// always fails. Use /tmp there instead. Locally, behavior is unchanged.
//
// IMPORTANT CAVEAT: /tmp on Vercel is NOT persistent — it can be wiped
// between invocations, and different requests may hit different
// instances that don't share it. This stops the crash and is fine for
// local dev and quick testing, but it is NOT a real fix for production
// file storage (especially 500MB video uploads, which will also run
// into Vercel's request size/duration limits regardless of where files
// are saved). See the note at the bottom of this file.
const UPLOAD_BASE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');
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
  const relative = filePath.replace(UPLOAD_BASE, '').replace(/\\/g, '/');
  return `/uploads${relative.startsWith('/') ? relative : `/${relative}`}`;
};

// ── Note on production readiness ──────────────────────────────
// This module now avoids crashing on Vercel, but local-disk storage
// (whether in the project folder or /tmp) is not a durable solution
// there: files can vanish between requests, and a 500MB video upload
// will likely hit Vercel's request body size and function duration
// limits before this code even runs. For real production use, swap
// these multer.diskStorage configs for a cloud storage backend
// (Cloudinary, AWS S3 via multer-s3, or Vercel Blob), and for large
// video files specifically, consider uploading directly from the
// client to that storage provider (e.g. via a signed upload URL)
// instead of routing the file through this server at all.

module.exports = {
  uploadVideo,
  uploadDocument,
  uploadImage,
  handleMulterError,
  getFileUrl
};