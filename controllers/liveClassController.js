// ============================================================
// controllers/liveClassController.js
// ============================================================
const LiveClass = require('../models/LiveClass');
const mongoose = require('mongoose');
const User = require('../models/User');
const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');
const {
  sendRegistrationConfirmation,
  sendBulkLiveClassUrls
} = require('../utils/emailService');

// helper: accept both comma-string and array
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
};

// ─────────────────────────────────────────────────────────────
// PUBLIC / STUDENT ENDPOINTS
// ─────────────────────────────────────────────────────────────
// GET /api/live-classes
exports.getLiveClasses = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
 
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  } else if (!status) {
    // Default: show upcoming + live only
    query.status = { $in: ['upcoming', 'live'] };
  }
  // If status === 'all', no filter — return everything
 
  const skip = (Number(page) - 1) * Number(limit);
  const total = await LiveClass.countDocuments(query);
 
  const classes = await LiveClass.find(query)
    .populate('instructor', 'name avatar')
    // FIX: do NOT select out registrations here — we need .length for virtuals
    // We strip sensitive fields manually below instead
    .sort({ scheduledAt: 1 })
    .skip(skip)
    .limit(Number(limit))
    .lean(); // lean() returns plain objects — virtuals won't fire, so we compute manually
 
  // Build registration lookup for current user
  let registrationSet = new Set();
  if (req.user) {
    const user = await User.findById(req.user.id).select('liveClassRegistrations').lean();
    (user?.liveClassRegistrations || []).forEach(r => {
      registrationSet.add(r.liveClass?.toString());
    });
  }
 
  // Map: strip sensitive fields, add computed fields safely
  const result = classes.map(c => {
    const regCount = Array.isArray(c.registrations) ? c.registrations.length : 0;
    return {
      _id: c._id,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail,
      instructor: c.instructor,
      scheduledAt: c.scheduledAt,
      duration: c.duration,
      platform: c.platform,
      price: c.price,
      isFree: c.isFree,
      maxParticipants: c.maxParticipants,
      urlSendMinutesBefore: c.urlSendMinutesBefore,
      status: c.status,
      tags: c.tags,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      // Computed — safe
      registrationCount: regCount,
      availableSeats: Math.max(0, (c.maxParticipants || 100) - regCount),
      isFull: regCount >= (c.maxParticipants || 100),
      isRegistered: registrationSet.has(c._id?.toString()),
      // Keep registrations array (without sensitive user data) for frontend count display
      registrations: (c.registrations || []).map(r => ({ _id: r._id, registeredAt: r.registeredAt }))
    };
  });
 
  return sendSuccess(res, {
    liveClasses: result,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    }
  });
});
 
// GET /api/live-classes/:id
exports.getLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id)
    .populate('instructor', 'name avatar');
 
  if (!liveClass) throw new AppError('Live class not found', 404);
 
  let registered = false;
  let showMeetingUrl = false;
 
  if (req.user) {
    const user = await User.findById(req.user.id).lean();
    registered = (user?.liveClassRegistrations || []).some(
      r => r.liveClass?.toString() === liveClass._id.toString()
    );
 
    const now = new Date();
    const minutesUntilClass = (liveClass.scheduledAt - now) / 60000;
    showMeetingUrl = registered && minutesUntilClass <= liveClass.urlSendMinutesBefore;
  }
 
  // Use lean-safe toObject
  const data = liveClass.toObject({ virtuals: false });
 
  const regCount = Array.isArray(data.registrations) ? data.registrations.length : 0;
  const availableSeats = Math.max(0, liveClass.maxParticipants - regCount);
 
  // Strip sensitive / heavy fields
  if (!showMeetingUrl) {
    delete data.meetingUrl;
    delete data.meetingPassword;
  }
  delete data.registrations;
 
  // Attach safe computed fields
  data.availableSeats = availableSeats;
  data.registrationCount = regCount;
  data.isFull = regCount >= liveClass.maxParticipants;
 
  return sendSuccess(res, { liveClass: data, registered, showMeetingUrl });
});

exports.register = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid class ID', 400);
  }

  const liveClass = await LiveClass.findById(id);
  if (!liveClass) throw new AppError('Live class not found', 404);

  // Check already registered — look in registrations[], not students[]
  const alreadyRegistered = liveClass.registrations.some(
    r => r.user?.toString() === req.user._id.toString()
  );
  if (alreadyRegistered) throw new AppError('Already registered', 400);

  if (liveClass.isFull) throw new AppError('Class is full', 400);

  if (liveClass.status === 'completed' || liveClass.status === 'cancelled') {
    throw new AppError(`Cannot register for a ${liveClass.status} class`, 400);
  }

  // Push into registrations[] with the correct schema shape
  liveClass.registrations.push({
    user: req.user._id,
    registeredAt: new Date(),
    amountPaid: 0
  });

  await liveClass.save();

  // Mirror on the User document so dashboard shows it
  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      liveClassRegistrations: {
        liveClass: liveClass._id,
        registeredAt: new Date()
      }
    }
  });

  return sendSuccess(res, {}, 'Registered successfully');
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/live-classes/admin/all
exports.getAllLiveClassesAdmin = asyncHandler(async (req, res) => {
  const classes = await LiveClass.find()
    .populate('instructor', 'name email')
    .sort({ scheduledAt: -1 });

  return sendSuccess(res, { classes });
});

// POST /api/live-classes
exports.createLiveClass = asyncHandler(async (req, res) => {
  const {
    title, description, scheduledAt, duration,
    meetingUrl, meetingId, meetingPassword, platform,
    price, isFree, maxParticipants, urlSendMinutesBefore,
    tags, course
  } = req.body;

  if (!scheduledAt) throw new AppError('scheduledAt is required', 400);

  // FIX: handle both datetime-local string (2024-06-15T10:30) and ISO string
  const parsedDate = new Date(scheduledAt);
  if (isNaN(parsedDate.getTime())) throw new AppError('Invalid date format for scheduledAt', 400);

  const thumbnail = req.file ? `/uploads/thumbnails/${req.file.filename}` : null;
  const priceNum = Number(price) || 0;

  const liveClass = await LiveClass.create({
    title,
    description,
    scheduledAt: parsedDate,
    duration: Number(duration) || 60,
    meetingUrl: meetingUrl || null,
    meetingId: meetingId || null,
    meetingPassword: meetingPassword || null,
    platform: platform || 'zoom',
    price: priceNum,
    isFree: isFree === 'true' || isFree === true || priceNum === 0,
    maxParticipants: Number(maxParticipants) || 100,
    urlSendMinutesBefore: Number(urlSendMinutesBefore) || 30,
    tags: toArray(tags),
    instructor: req.user.id,
    course: course || null,
    thumbnail
  });

  return sendSuccess(res, { liveClass }, 'Live class created', 201);
});

// PUT /api/live-classes/:id
exports.updateLiveClass = asyncHandler(async (req, res) => {
  let liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new AppError('Live class not found', 404);

  const updates = { ...req.body };
  if (req.file) updates.thumbnail = `/uploads/thumbnails/${req.file.filename}`;

  // FIX: properly parse scheduledAt from datetime-local or ISO
  if (updates.scheduledAt) {
    const parsedDate = new Date(updates.scheduledAt);
    if (isNaN(parsedDate.getTime())) throw new AppError('Invalid date format for scheduledAt', 400);
    updates.scheduledAt = parsedDate;
  }

  if (updates.price !== undefined) {
    updates.price = Number(updates.price) || 0;
  }
  if (updates.tags !== undefined) updates.tags = toArray(updates.tags);
  if (updates.isFree !== undefined) updates.isFree = updates.isFree === 'true' || updates.isFree === true;

  liveClass = await LiveClass.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

  return sendSuccess(res, { liveClass }, 'Live class updated');
});

// DELETE /api/live-classes/:id
exports.deleteLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new AppError('Live class not found', 404);
  await liveClass.deleteOne();
  return sendSuccess(res, {}, 'Live class deleted');
});

// PATCH /api/live-classes/:id/status
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['upcoming', 'live', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

  const liveClass = await LiveClass.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!liveClass) throw new AppError('Live class not found', 404);

  return sendSuccess(res, { liveClass }, `Status updated to ${status}`);
});

// PATCH /api/live-classes/:id/meeting-url
exports.setMeetingUrl = asyncHandler(async (req, res) => {
  const { meetingUrl, meetingId, meetingPassword } = req.body;

  const liveClass = await LiveClass.findByIdAndUpdate(
    req.params.id,
    { meetingUrl, meetingId, meetingPassword },
    { new: true }
  );
  if (!liveClass) throw new AppError('Live class not found', 404);

  return sendSuccess(res, { liveClass }, 'Meeting URL updated');
});

// POST /api/live-classes/:id/send-url
exports.sendUrlToAll = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) throw new AppError('Live class not found', 404);
  if (!liveClass.meetingUrl) throw new AppError('Meeting URL not set yet', 400);

  const userIds = liveClass.registrations.map(r => r.user);
  const users = await User.find({ _id: { $in: userIds }, isActive: true });

  const result = await sendBulkLiveClassUrls(liveClass, users);

  await LiveClass.updateOne(
    { _id: liveClass._id },
    {
      $set: {
        urlSent: true,
        'registrations.$[].urlSent': true,
        'registrations.$[].urlSentAt': new Date()
      }
    }
  );

  return sendSuccess(res, result, `Sent to ${result.succeeded} of ${result.total} registrants`);
});

// GET /api/live-classes/:id/registrants
exports.getRegistrants = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id)
    .populate('registrations.user', 'name email phone');
  if (!liveClass) throw new AppError('Live class not found', 404);
  return sendSuccess(res, { registrations: liveClass.registrations });
});

// POST /api/live-classes/:id/registrations/:userId/mark-attended
exports.markAttended = asyncHandler(async (req, res) => {
  await LiveClass.updateOne(
    { _id: req.params.id, 'registrations.user': req.params.userId },
    { $set: { 'registrations.$.attended': true } }
  );
  return sendSuccess(res, {}, 'Marked as attended');
});