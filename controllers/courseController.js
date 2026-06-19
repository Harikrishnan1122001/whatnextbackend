// // ============================================================
// // controllers/courseController.js
// // ============================================================
// const Course = require('../models/Course');
// const User = require('../models/User');
// const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');

// // helper: accept both comma-string and array
// const toArray = (val) => {
//   if (!val) return [];
//   if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
//   return String(val).split(',').map(s => s.trim()).filter(Boolean);
// };

// // ─────────────────────────────────────────────────────────────
// // PUBLIC / STUDENT ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // GET /api/courses
// exports.getCourses = asyncHandler(async (req, res) => {
//   const { search, category, level, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
//   const query = { isPublished: true };

//   if (search) query.$text = { $search: search };
//   if (category) query.category = category;
//   if (level) query.level = level;
//   if (minPrice || maxPrice) {
//     query.price = {};
//     if (minPrice) query.price.$gte = Number(minPrice);
//     if (maxPrice) query.price.$lte = Number(maxPrice);
//   }

//   const skip = (Number(page) - 1) * Number(limit);
//   const total = await Course.countDocuments(query);

//   const courses = await Course.find(query)
//     .populate('instructor', 'name avatar')
//     .select('-videos.videoUrl')
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(Number(limit));

//   return sendSuccess(res, {
//     courses,
//     pagination: {
//       total, page: Number(page), limit: Number(limit),
//       pages: Math.ceil(total / Number(limit))
//     }
//   });
// });

// // GET /api/courses/:id
// exports.getCourse = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.id)
//     .populate('instructor', 'name avatar')
//     .populate('notes', 'title price effectivePrice isFree');

//   if (!course || !course.isPublished) throw new AppError('Course not found', 404);

//   let purchased = false;
//   if (req.user) {
//     const user = await User.findById(req.user.id);
//     purchased = user.hasPurchasedCourse(course._id);
//   }

//   const courseData = course.toObject();
//   courseData.videos = courseData.videos.map(v => ({
//     ...v,
//     videoUrl: (purchased || v.isPreview) ? v.videoUrl : null,
//     locked: !purchased && !v.isPreview,
//     buyNowTriggerSeconds: v.buyNowTriggerSeconds
//   }));

//   // FIX: field name is "purchased" (consistent with frontend)
//   return sendSuccess(res, { course: courseData, purchased });
// });

// // POST /api/courses/:id/progress
// exports.updateProgress = asyncHandler(async (req, res) => {
//   const { videoId, watchedSeconds } = req.body;
//   const courseId = req.params.id;

//   const user = await User.findById(req.user.id);
//   if (!user.hasPurchasedCourse(courseId) && user.role !== 'admin') {
//     throw new AppError('Purchase this course to track progress', 403);
//   }

//   const existingIdx = user.videoProgress.findIndex(
//     p => p.course.toString() === courseId && p.videoId === videoId
//   );

//   if (existingIdx > -1) {
//     user.videoProgress[existingIdx].watchedSeconds = watchedSeconds;
//     user.videoProgress[existingIdx].lastWatched = new Date();
//   } else {
//     user.videoProgress.push({ course: courseId, videoId, watchedSeconds });
//   }

//   await user.save();
//   return sendSuccess(res, {}, 'Progress saved');
// });

// // ─────────────────────────────────────────────────────────────
// // ADMIN ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // POST /api/courses
// exports.createCourse = asyncHandler(async (req, res) => {
//   const {
//     title, description, shortDescription, price, discountPrice,
//     isFree, category, tags, level, language, requirements, outcomes
//   } = req.body;

//   const thumbnail = req.file ? `/uploads/thumbnails/${req.file.filename}` : null;

//   const course = await Course.create({
//     title,
//     description,
//     shortDescription,
//     price: Number(price) || 0,
//     discountPrice: discountPrice ? Number(discountPrice) : null,
//     isFree: isFree === 'true' || isFree === true,
//     category,
//     level,
//     language,
//     tags: toArray(tags),
//     requirements: toArray(requirements),
//     outcomes: toArray(outcomes),
//     thumbnail,
//     instructor: req.user.id
//   });

//   return sendSuccess(res, { course }, 'Course created successfully', 201);
// });

// // PUT /api/courses/:id
// exports.updateCourse = asyncHandler(async (req, res) => {
//   let course = await Course.findById(req.params.id);
//   if (!course) throw new AppError('Course not found', 404);

//   const updates = { ...req.body };
//   if (req.file) updates.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
//   if (updates.price !== undefined) updates.price = Number(updates.price);
//   if (updates.discountPrice !== undefined) updates.discountPrice = updates.discountPrice ? Number(updates.discountPrice) : null;
//   if (updates.tags !== undefined) updates.tags = toArray(updates.tags);
//   if (updates.requirements !== undefined) updates.requirements = toArray(updates.requirements);
//   if (updates.outcomes !== undefined) updates.outcomes = toArray(updates.outcomes);
//   if (updates.isFree !== undefined) updates.isFree = updates.isFree === 'true' || updates.isFree === true;

//   course = await Course.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

//   return sendSuccess(res, { course }, 'Course updated successfully');
// });

// // DELETE /api/courses/:id
// exports.deleteCourse = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.id);
//   if (!course) throw new AppError('Course not found', 404);
//   await course.deleteOne();
//   return sendSuccess(res, {}, 'Course deleted');
// });

// // PATCH /api/courses/:id/publish
// exports.togglePublish = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.id);
//   if (!course) throw new AppError('Course not found', 404);
//   course.isPublished = !course.isPublished;
//   course.publishedAt = course.isPublished ? new Date() : null;
//   await course.save();
//   return sendSuccess(res, { isPublished: course.isPublished },
//     `Course ${course.isPublished ? 'published' : 'unpublished'}`);
// });

// // ── Video management ──────────────────────────────────────────

// // POST /api/courses/:id/videos/upload
// exports.uploadVideo = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.id);
//   if (!course) throw new AppError('Course not found', 404);
//   if (!req.file) throw new AppError('Video file is required', 400);

//   const { title, description, order, isPreview, buyNowTriggerSeconds, duration } = req.body;

//   const video = {
//     title: title || req.file.originalname,
//     description: description || '',
//     videoUrl: `/uploads/videos/${req.file.filename}`,
//     videoType: 'upload',
//     duration: Number(duration) || 0,
//     order: Number(order) || course.videos.length,
//     isPreview: isPreview === 'true' || isPreview === true,
//     buyNowTriggerSeconds: Number(buyNowTriggerSeconds) || 300,
//     views: 0
//   };

//   course.videos.push(video);
//   await course.save();

//   return sendSuccess(res, { video: course.videos[course.videos.length - 1] }, 'Video uploaded successfully', 201);
// });

// // POST /api/courses/:id/videos/url
// exports.addVideoUrl = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.id);
//   if (!course) throw new AppError('Course not found', 404);

//   const { title, videoUrl, description, order, isPreview, buyNowTriggerSeconds, duration } = req.body;

//   if (!title) throw new AppError('Video title is required', 400);
//   if (!videoUrl) throw new AppError('Video URL is required', 400);

//   const video = {
//     title,
//     videoUrl,
//     videoType: 'url',
//     description: description || '',
//     order: Number(order) || course.videos.length,
//     isPreview: isPreview === 'true' || isPreview === true,
//     buyNowTriggerSeconds: Number(buyNowTriggerSeconds) || 300,
//     duration: Number(duration) || 0,
//     views: 0
//   };

//   course.videos.push(video);
//   await course.save();

//   return sendSuccess(res, { video: course.videos[course.videos.length - 1] }, 'Video URL added successfully', 201);
// });

// // PUT /api/courses/:courseId/videos/:videoId
// exports.updateVideo = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.courseId);
//   if (!course) throw new AppError('Course not found', 404);

//   const videoIdx = course.videos.findIndex(v => v._id.toString() === req.params.videoId);
//   if (videoIdx === -1) throw new AppError('Video not found', 404);

//   const allowed = ['title', 'description', 'order', 'isPreview', 'buyNowTriggerSeconds', 'duration'];
//   allowed.forEach(field => {
//     if (req.body[field] !== undefined) course.videos[videoIdx][field] = req.body[field];
//   });

//   await course.save();
//   return sendSuccess(res, { video: course.videos[videoIdx] }, 'Video updated');
// });

// // DELETE /api/courses/:courseId/videos/:videoId
// exports.deleteVideo = asyncHandler(async (req, res) => {
//   const course = await Course.findById(req.params.courseId);
//   if (!course) throw new AppError('Course not found', 404);
//   course.videos = course.videos.filter(v => v._id.toString() !== req.params.videoId);
//   await course.save();
//   return sendSuccess(res, {}, 'Video deleted');
// });

// // GET /api/courses/admin/all
// exports.getAllCoursesAdmin = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 20 } = req.query;
//   const skip = (page - 1) * limit;
//   const total = await Course.countDocuments();

//   const courses = await Course.find()
//     .populate('instructor', 'name email')
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(Number(limit));

//   return sendSuccess(res, {
//     courses,
//     pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
//   });
// });

// ============================================================
// controllers/courseController.js
// ============================================================
const Course = require('../models/Course');
const User = require('../models/User');
const { asyncHandler, AppError, sendSuccess } = require('../utils/helpers');
const cloudinary = require('../config/cloudinary');

// ── helpers ──────────────────────────────────────────────────
const getCourseWithAccess = async (courseId, userId) => {
  const course = await Course.findById(courseId).populate('instructor', 'name email avatar');
  if (!course || !course.isPublished) throw new AppError('Course not found', 404);

  let hasPurchased = false;
  let progress = [];

  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      hasPurchased = user.hasPurchasedCourse(courseId);
      progress = user.courseProgress?.find(p => p.course.toString() === courseId.toString())?.completedVideos || [];
    }
  }

  return { course, hasPurchased, progress };
};

// ── GET /api/courses ──────────────────────────────────────────
exports.getCourses = asyncHandler(async (req, res) => {
  const { category, search, sort = '-createdAt', page = 1, limit = 12 } = req.query;

  const filter = { isPublished: true };
  if (category && category !== 'All') filter.category = category;
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('instructor', 'name avatar')
      .select('-videos.videoUrl'),          // hide raw URLs in listing
    Course.countDocuments(filter),
  ]);

  // attach purchase flag if user is logged in
  let purchasedIds = new Set();
  if (req.user) {
    const user = await User.findById(req.user.id).select('purchasedCourses');
    purchasedIds = new Set(user.purchasedCourses.map(p => p.course.toString()));
  }

  const data = courses.map(c => ({
    ...c.toObject(),
    purchased: purchasedIds.has(c._id.toString()),
  }));

  return sendSuccess(res, { courses: data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ── GET /api/courses/:id ──────────────────────────────────────
exports.getCourse = asyncHandler(async (req, res) => {
  const { course, hasPurchased, progress } = await getCourseWithAccess(req.params.id, req.user?.id);

  const courseObj = course.toObject();

  // Hide video URLs for locked videos
  if (!hasPurchased) {
    courseObj.videos = courseObj.videos.map(v => ({
      ...v,
      videoUrl: v.isPreview ? v.videoUrl : undefined,
    }));
  }

  return sendSuccess(res, { course: courseObj, purchased: hasPurchased, progress });
});

// ── POST /api/courses/:id/enroll  (FREE courses) ─────────────
exports.enrollFreeCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course || !course.isPublished) throw new AppError('Course not found', 404);

  if (!course.isFree && course.price > 0) {
    throw new AppError('This course requires payment. Use the payment endpoint.', 400);
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  // Already enrolled — return success without double-adding
  if (user.hasPurchasedCourse(course._id)) {
    return sendSuccess(res, { alreadyEnrolled: true }, 'Already enrolled');
  }

  user.purchasedCourses.push({ course: course._id, purchasedAt: new Date() });
  await user.save();

  course.totalStudents = (course.totalStudents || 0) + 1;
  await course.save();

  return sendSuccess(res, { purchased: true, courseId: course._id }, 'Enrolled successfully');
});

// ── POST /api/courses/:id/progress ───────────────────────────
exports.updateProgress = asyncHandler(async (req, res) => {
  const { videoId, completed } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  // Must own the course
  if (!user.hasPurchasedCourse(req.params.id)) {
    throw new AppError('You have not enrolled in this course', 403);
  }

  let prog = user.courseProgress?.find(p => p.course.toString() === req.params.id);
  if (!prog) {
    user.courseProgress = user.courseProgress || [];
    user.courseProgress.push({ course: req.params.id, completedVideos: [] });
    prog = user.courseProgress[user.courseProgress.length - 1];
  }

  if (completed) {
    if (!prog.completedVideos.includes(videoId)) prog.completedVideos.push(videoId);
  } else {
    prog.completedVideos = prog.completedVideos.filter(v => v.toString() !== videoId);
  }

  await user.save();
  return sendSuccess(res, { completedVideos: prog.completedVideos });
});

// ── GET /api/courses/admin/all  (admin) ──────────────────────
exports.getAllCoursesAdmin = asyncHandler(async (req, res) => {
  const courses = await Course.find({})
    .sort('-createdAt')
    .populate('instructor', 'name email');
  return sendSuccess(res, { courses, total: courses.length });
});

// ── POST /api/courses  (admin) ───────────────────────────────
exports.createCourse = asyncHandler(async (req, res) => {
  const { title, description, category, price, isFree, tags } = req.body;

  const courseData = {
    title,
    description,
    category,
    price: isFree ? 0 : Number(price) || 0,
    isFree: isFree === 'true' || isFree === true,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
    instructor: req.user.id,
    isPublished: false,
  };

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'courses/thumbnails' });
    courseData.thumbnail = result.secure_url;
    courseData.thumbnailPublicId = result.public_id;
  }

  const course = await Course.create(courseData);
  return sendSuccess(res, { course }, 'Course created', 201);
});

// ── PUT /api/courses/:id  (admin) ────────────────────────────
exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  const { title, description, category, price, isFree, tags } = req.body;
  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (category !== undefined) course.category = category;
  if (isFree !== undefined) {
    course.isFree = isFree === 'true' || isFree === true;
    course.price = course.isFree ? 0 : (price !== undefined ? Number(price) : course.price);
  } else if (price !== undefined) {
    course.price = Number(price);
  }
  if (tags !== undefined) {
    course.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
  }

  if (req.file) {
    if (course.thumbnailPublicId) {
      await cloudinary.uploader.destroy(course.thumbnailPublicId);
    }
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'courses/thumbnails' });
    course.thumbnail = result.secure_url;
    course.thumbnailPublicId = result.public_id;
  }

  await course.save();
  return sendSuccess(res, { course }, 'Course updated');
});

// ── DELETE /api/courses/:id  (admin) ─────────────────────────
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  if (course.thumbnailPublicId) {
    await cloudinary.uploader.destroy(course.thumbnailPublicId);
  }
  for (const video of course.videos) {
    if (video.publicId) await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
  }

  await course.deleteOne();
  return sendSuccess(res, null, 'Course deleted');
});

// ── PATCH /api/courses/:id/publish  (admin) ──────────────────
exports.togglePublish = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  course.isPublished = !course.isPublished;
  await course.save();
  return sendSuccess(res, { isPublished: course.isPublished }, `Course ${course.isPublished ? 'published' : 'unpublished'}`);
});

// ── POST /api/courses/:id/videos/upload  (admin) ─────────────
exports.uploadVideo = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);
  if (!req.file) throw new AppError('No video file provided', 400);

  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: 'video',
    folder: 'courses/videos',
  });

  const video = {
    title: req.body.title || 'Untitled',
    description: req.body.description || '',
    videoUrl: result.secure_url,
    publicId: result.public_id,
    duration: Math.round(result.duration || 0),
    isPreview: req.body.isPreview === 'true',
  };

  course.videos.push(video);
  await course.save();

  return sendSuccess(res, { video: course.videos[course.videos.length - 1] }, 'Video uploaded', 201);
});

// ── POST /api/courses/:id/videos/url  (admin) ────────────────
exports.addVideoUrl = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  const video = {
    title: req.body.title,
    description: req.body.description || '',
    videoUrl: req.body.videoUrl,
    duration: Number(req.body.duration) || 0,
    isPreview: req.body.isPreview === true || req.body.isPreview === 'true',
  };

  course.videos.push(video);
  await course.save();

  return sendSuccess(res, { video: course.videos[course.videos.length - 1] }, 'Video added', 201);
});

// ── PUT /api/courses/:courseId/videos/:videoId  (admin) ───────
exports.updateVideo = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new AppError('Course not found', 404);

  const video = course.videos.id(req.params.videoId);
  if (!video) throw new AppError('Video not found', 404);

  const { title, description, isPreview, duration } = req.body;
  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (isPreview !== undefined) video.isPreview = isPreview === true || isPreview === 'true';
  if (duration !== undefined) video.duration = Number(duration);

  await course.save();
  return sendSuccess(res, { video }, 'Video updated');
});

// ── DELETE /api/courses/:courseId/videos/:videoId  (admin) ────
exports.deleteVideo = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new AppError('Course not found', 404);

  const video = course.videos.id(req.params.videoId);
  if (!video) throw new AppError('Video not found', 404);

  if (video.publicId) {
    await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
  }

  video.deleteOne();
  await course.save();
  return sendSuccess(res, null, 'Video deleted');
});