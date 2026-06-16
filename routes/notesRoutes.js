// ============================================================
// routes/notesRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();

const {
  getNotes, getNote, downloadNote,
  getAllNotesAdmin, createNotes, updateNotes,
  deleteNotes, togglePublish
} = require('../controllers/notesController');

const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { uploadDocument, uploadImage, handleMulterError } = require('../middleware/upload');
const { validate, notesRules } = require('../middleware/validate');
const multer = require('multer');

// ── Public / student ─────────────────────────────────────────
router.get('/', optionalAuth, getNotes);
router.get('/:id', optionalAuth, getNote);
router.get('/:id/download', protect, downloadNote);

// ── Admin only ────────────────────────────────────────────────
router.get('/admin/all', protect, adminOnly, getAllNotesAdmin);

// Upload: document file + optional thumbnail
const cpUpload = uploadDocument.fields([
  { name: 'document', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

router.post('/',
  protect, adminOnly,
  (req, res, next) => {
    // Use document field for the actual file
    uploadDocument.single('document')(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  notesRules, validate,
  createNotes
);

router.put('/:id',
  protect, adminOnly,
  uploadDocument.single('document'),
  handleMulterError,
  updateNotes
);

router.delete('/:id',              protect, adminOnly, deleteNotes);
router.patch('/:id/toggle-publish', protect, adminOnly, togglePublish);

module.exports = router;