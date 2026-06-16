// // ============================================================
// // routes/liveClassRoutes.js
// // ============================================================
// const express = require('express');
// const router = express.Router();

// const {
//   getLiveClasses, getLiveClass, register,
//   getAllLiveClassesAdmin, createLiveClass, updateLiveClass,
//   deleteLiveClass, updateStatus, setMeetingUrl,
//   sendUrlToAll, getRegistrants, markAttended
// } = require('../controllers/liveClassController');

// const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
// const { uploadImage, handleMulterError } = require('../middleware/upload');
// const { validate, liveClassRules } = require('../middleware/validate');

// // ── Public (with optional auth) ───────────────────────────────
// router.get('/', optionalAuth, getLiveClasses);
// router.get('/:id', optionalAuth, getLiveClass);

// // ── Student ───────────────────────────────────────────────────
// router.post('/:id/register', protect, register);

// // ── Admin only ────────────────────────────────────────────────
// router.get('/admin/all', protect, adminOnly, getAllLiveClassesAdmin);

// router.post('/',
//   protect, adminOnly,
//   uploadImage.single('thumbnail'),
//   handleMulterError,
//   liveClassRules, validate,
//   createLiveClass
// );

// router.put('/:id',
//   protect, adminOnly,
//   uploadImage.single('thumbnail'),
//   handleMulterError,
//   updateLiveClass
// );

// router.delete('/:id',               protect, adminOnly, deleteLiveClass);
// router.patch('/:id/status',         protect, adminOnly, updateStatus);
// router.patch('/:id/meeting-url',    protect, adminOnly, setMeetingUrl);
// router.post('/:id/send-url',        protect, adminOnly, sendUrlToAll);
// router.get('/:id/registrants',      protect, adminOnly, getRegistrants);
// router.patch('/:id/registrations/:userId/attended', protect, adminOnly, markAttended);

// module.exports = router;


// routes/liveClassRoutes.js — FIXED
const express = require('express');
const router = express.Router();

const {
  getLiveClasses, getLiveClass, register,
  getAllLiveClassesAdmin, createLiveClass, updateLiveClass,
  deleteLiveClass, updateStatus, setMeetingUrl,
  sendUrlToAll, getRegistrants, markAttended
} = require('../controllers/liveClassController');

const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { uploadImage, handleMulterError } = require('../middleware/upload');
const { validate, liveClassRules } = require('../middleware/validate');

// ── CRITICAL: Static routes MUST come before /:id ─────────────
// If /admin/all is after /:id, Express matches "admin" as the :id param

// ── Public ────────────────────────────────────────────────────
router.get('/', optionalAuth, getLiveClasses);

// ── Admin static routes (BEFORE /:id) ────────────────────────
router.get('/admin/all', protect, adminOnly, getAllLiveClassesAdmin);

router.post('/',
  protect, adminOnly,
  uploadImage.single('thumbnail'),
  handleMulterError,
  liveClassRules, validate,
  createLiveClass
);

// ── Dynamic /:id routes ───────────────────────────────────────
router.get('/:id', optionalAuth, getLiveClass);
router.post('/:id/register', protect, register);

router.put('/:id',
  protect, adminOnly,
  uploadImage.single('thumbnail'),
  handleMulterError,
  updateLiveClass
);

router.delete('/:id',                                    protect, adminOnly, deleteLiveClass);
router.patch('/:id/status',                              protect, adminOnly, updateStatus);
router.patch('/:id/meeting-url',                         protect, adminOnly, setMeetingUrl);
router.post('/:id/send-url',                             protect, adminOnly, sendUrlToAll);
router.get('/:id/registrants',                           protect, adminOnly, getRegistrants);
router.patch('/:id/registrations/:userId/attended',      protect, adminOnly, markAttended);

module.exports = router;