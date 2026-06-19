// // ============================================================
// // routes/courseRoutes.js
// // ============================================================
// const express = require('express');
// const router = express.Router();

// const {
//   getCourses, getCourse, createCourse, updateCourse, deleteCourse,
//   togglePublish, uploadVideo, addVideoUrl, updateVideo, deleteVideo,
//   updateProgress, getAllCoursesAdmin
// } = require('../controllers/courseController');

// const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
// const { uploadVideo: uploadVideoFile, uploadImage, handleMulterError } = require('../middleware/upload');
// const { validate, courseRules, videoUrlRules } = require('../middleware/validate');

// // ── Public (with optional auth to check purchase status) ─────
// router.get('/', optionalAuth, getCourses);
// router.get('/:id', optionalAuth, getCourse);

// // ── Student (requires login) ──────────────────────────────────
// router.post('/:id/progress', protect, updateProgress);

// // ── Admin only ────────────────────────────────────────────────
// router.get('/admin/all', protect, adminOnly, getAllCoursesAdmin);

// router.post('/',
//   protect, adminOnly,
//   uploadImage.single('thumbnail'),
//   handleMulterError,
//   courseRules, validate,
//   createCourse
// );

// router.put('/:id',
//   protect, adminOnly,
//   uploadImage.single('thumbnail'),
//   handleMulterError,
//   updateCourse
// );

// router.delete('/:id',       protect, adminOnly, deleteCourse);
// router.patch('/:id/publish', protect, adminOnly, togglePublish);

// // ── Video management (admin) ──────────────────────────────────
// router.post('/:id/videos/upload',
//   protect, adminOnly,
//   uploadVideoFile.single('video'),
//   handleMulterError,
//   uploadVideo
// );

// router.post('/:id/videos/url',
//   protect, adminOnly,
//   videoUrlRules, validate,
//   addVideoUrl
// );

// router.put('/:courseId/videos/:videoId',  protect, adminOnly, updateVideo);
// router.delete('/:courseId/videos/:videoId', protect, adminOnly, deleteVideo);

// module.exports = router;

// ============================================================
// routes/courseRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();

const {
  getCourses, getCourse, createCourse, updateCourse, deleteCourse,
  togglePublish, uploadVideo, addVideoUrl, updateVideo, deleteVideo,
  updateProgress, getAllCoursesAdmin, enrollFreeCourse
} = require('../controllers/courseController');

const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { uploadVideo: uploadVideoFile, uploadImage, handleMulterError } = require('../middleware/upload');
const { validate, courseRules, videoUrlRules } = require('../middleware/validate');

// ── Public (with optional auth to check purchase status) ─────
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);

// ── Student (requires login) ──────────────────────────────────
router.post('/:id/progress', protect, updateProgress);
router.post('/:id/enroll', protect, enrollFreeCourse);

// ── Admin only ────────────────────────────────────────────────
router.get('/admin/all', protect, adminOnly, getAllCoursesAdmin);

router.post('/',
  protect, adminOnly,
  uploadImage.single('thumbnail'),
  handleMulterError,
  courseRules, validate,
  createCourse
);

router.put('/:id',
  protect, adminOnly,
  uploadImage.single('thumbnail'),
  handleMulterError,
  updateCourse
);

router.delete('/:id',       protect, adminOnly, deleteCourse);
router.patch('/:id/publish', protect, adminOnly, togglePublish);

// ── Video management (admin) ──────────────────────────────────
router.post('/:id/videos/upload',
  protect, adminOnly,
  uploadVideoFile.single('video'),
  handleMulterError,
  uploadVideo
);

router.post('/:id/videos/url',
  protect, adminOnly,
  videoUrlRules, validate,
  addVideoUrl
);

router.put('/:courseId/videos/:videoId',  protect, adminOnly, updateVideo);
router.delete('/:courseId/videos/:videoId', protect, adminOnly, deleteVideo);

module.exports = router;