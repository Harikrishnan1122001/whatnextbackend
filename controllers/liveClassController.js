// // ============================================================
// // controllers/liveClassController.js
// // ============================================================
// const LiveClass = require('../models/LiveClass');
// const User = require('../models/User');
// const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');
// const {
//   sendRegistrationConfirmation,
//   sendBulkLiveClassUrls
// } = require('../utils/emailService');

// // ─────────────────────────────────────────────────────────────
// // PUBLIC / STUDENT ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // GET /api/live-classes — list upcoming live classes
// exports.getLiveClasses = asyncHandler(async (req, res) => {
//   const { status, page = 1, limit = 10 } = req.query;
//   const query = {};
//   if (status) query.status = status;
//   else query.status = { $in: ['upcoming', 'live'] };

//   const skip = (page - 1) * limit;
//   const total = await LiveClass.countDocuments(query);

//   const classes = await LiveClass.find(query)
//     .populate('instructor', 'name avatar')
//     .select('-registrations -meetingUrl -meetingPassword')  // hide meeting details
//     .sort({ scheduledAt: 1 })
//     .skip(skip)
//     .limit(Number(limit));

//   // Attach isRegistered flag if user is logged in
//   let registrationMap = {};
//   if (req.user) {
//     const user = await User.findById(req.user.id).select('liveClassRegistrations');
//     user.liveClassRegistrations.forEach(r => {
//       registrationMap[r.liveClass.toString()] = true;
//     });
//   }

//   const result = classes.map(c => ({
//     ...c.toObject(),
//     isRegistered: !!registrationMap[c._id.toString()]
//   }));

//   return sendSuccess(res, {
//     classes: result,
//     pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
//   });
// });

// // GET /api/live-classes/:id — single live class
// exports.getLiveClass = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id)
//     .populate('instructor', 'name avatar');

//   if (!liveClass) throw new AppError('Live class not found', 404);

//   let isRegistered = false;
//   let showMeetingUrl = false;

//   if (req.user) {
//     const user = await User.findById(req.user.id);
//     isRegistered = user.isRegisteredForClass(liveClass._id);
//     // Show meeting URL only to registered users when class is close/live
//     const now = new Date();
//     const minutesUntilClass = (liveClass.scheduledAt - now) / 60000;
//     showMeetingUrl = isRegistered && minutesUntilClass <= liveClass.urlSendMinutesBefore;
//   }

//   const data = liveClass.toObject();
//   if (!showMeetingUrl) {
//     delete data.meetingUrl;
//     delete data.meetingPassword;
//   }
//   delete data.registrations;  // never expose registrations list publicly

//   return sendSuccess(res, { liveClass: data, isRegistered, showMeetingUrl });
// });

// // POST /api/live-classes/:id/register — register for a free live class
// exports.register = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id);
//   if (!liveClass) throw new AppError('Live class not found', 404);
//   if (liveClass.status !== 'upcoming') throw new AppError('Registration is closed for this class', 400);
//   if (liveClass.isFull) throw new AppError('This live class is full', 400);
//   if (!liveClass.isFree) throw new AppError('This is a paid class. Please purchase first.', 400);

//   const user = await User.findById(req.user.id);
//   if (user.isRegisteredForClass(liveClass._id)) {
//     throw new AppError('You are already registered for this class', 400);
//   }

//   // Add registration to LiveClass
//   liveClass.registrations.push({ user: req.user.id });
//   await liveClass.save();

//   // Add to user's registrations
//   user.liveClassRegistrations.push({ liveClass: liveClass._id });
//   await user.save();

//   // Send confirmation email
//   sendRegistrationConfirmation(user, liveClass).catch(err =>
//     console.error('Registration confirmation email failed:', err.message)
//   );

//   return sendSuccess(res, {}, 'Successfully registered for the live class', 201);
// });

// // ─────────────────────────────────────────────────────────────
// // ADMIN ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // GET /api/live-classes/admin/all — all live classes with registrations
// exports.getAllLiveClassesAdmin = asyncHandler(async (req, res) => {
//   const classes = await LiveClass.find()
//     .populate('instructor', 'name email')
//     .sort({ scheduledAt: -1 });

//   return sendSuccess(res, { classes });
// });

// // POST /api/live-classes — create live class
// exports.createLiveClass = asyncHandler(async (req, res) => {
//   const {
//     title, description, scheduledAt, duration,
//     meetingUrl, meetingId, meetingPassword, platform,
//     price, isFree, maxParticipants, urlSendMinutesBefore,
//     tags, course
//   } = req.body;

//   const thumbnail = req.file ? `/uploads/thumbnails/${req.file.filename}` : null;

//   const liveClass = await LiveClass.create({
//     title, description,
//     scheduledAt: new Date(scheduledAt),
//     duration: Number(duration) || 60,
//     meetingUrl, meetingId, meetingPassword,
//     platform: platform || 'zoom',
//     price: Number(price) || 0,
//     isFree: isFree === 'true' || isFree === true || Number(price) === 0,
//     maxParticipants: Number(maxParticipants) || 100,
//     urlSendMinutesBefore: Number(urlSendMinutesBefore) || 30,
//     tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
//     instructor: req.user.id,
//     course: course || null,
//     thumbnail
//   });

//   return sendSuccess(res, { liveClass }, 'Live class created', 201);
// });

// // PUT /api/live-classes/:id — update live class
// exports.updateLiveClass = asyncHandler(async (req, res) => {
//   let liveClass = await LiveClass.findById(req.params.id);
//   if (!liveClass) throw new AppError('Live class not found', 404);

//   const updates = { ...req.body };
//   if (req.file) updates.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
//   if (updates.scheduledAt) updates.scheduledAt = new Date(updates.scheduledAt);

//   liveClass = await LiveClass.findByIdAndUpdate(req.params.id, updates, {
//     new: true, runValidators: true
//   });

//   return sendSuccess(res, { liveClass }, 'Live class updated');
// });

// // DELETE /api/live-classes/:id — delete live class
// exports.deleteLiveClass = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id);
//   if (!liveClass) throw new AppError('Live class not found', 404);

//   await liveClass.deleteOne();
//   return sendSuccess(res, {}, 'Live class deleted');
// });

// // PATCH /api/live-classes/:id/status — update status
// exports.updateStatus = asyncHandler(async (req, res) => {
//   const { status } = req.body;
//   const allowed = ['upcoming', 'live', 'completed', 'cancelled'];
//   if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

//   const liveClass = await LiveClass.findByIdAndUpdate(
//     req.params.id, { status }, { new: true }
//   );
//   if (!liveClass) throw new AppError('Live class not found', 404);

//   return sendSuccess(res, { liveClass }, `Status updated to ${status}`);
// });

// // PATCH /api/live-classes/:id/meeting-url — set/update meeting URL
// exports.setMeetingUrl = asyncHandler(async (req, res) => {
//   const { meetingUrl, meetingId, meetingPassword } = req.body;

//   const liveClass = await LiveClass.findByIdAndUpdate(
//     req.params.id,
//     { meetingUrl, meetingId, meetingPassword },
//     { new: true }
//   );
//   if (!liveClass) throw new AppError('Live class not found', 404);

//   return sendSuccess(res, { liveClass }, 'Meeting URL updated');
// });

// // POST /api/live-classes/:id/send-url — manually send URL to all registrants
// exports.sendUrlToAll = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id);
//   if (!liveClass) throw new AppError('Live class not found', 404);
//   if (!liveClass.meetingUrl) throw new AppError('Meeting URL not set yet', 400);

//   const userIds = liveClass.registrations.map(r => r.user);
//   const users = await User.find({ _id: { $in: userIds }, isActive: true });

//   const result = await sendBulkLiveClassUrls(liveClass, users);

//   // Mark all registrations as URL sent
//   await LiveClass.updateOne(
//     { _id: liveClass._id },
//     {
//       $set: {
//         urlSent: true,
//         'registrations.$[].urlSent': true,
//         'registrations.$[].urlSentAt': new Date()
//       }
//     }
//   );

//   return sendSuccess(res, result, `Sent to ${result.succeeded} of ${result.total} registrants`);
// });

// // GET /api/live-classes/:id/registrants — list registrants
// exports.getRegistrants = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id)
//     .populate('registrations.user', 'name email phone');

//   if (!liveClass) throw new AppError('Live class not found', 404);

//   return sendSuccess(res, { registrations: liveClass.registrations });
// });

// // POST /api/live-classes/:id/registrations/:userId/mark-attended
// exports.markAttended = asyncHandler(async (req, res) => {
//   await LiveClass.updateOne(
//     { _id: req.params.id, 'registrations.user': req.params.userId },
//     { $set: { 'registrations.$.attended': true } }
//   );
//   return sendSuccess(res, {}, 'Marked as attended');
// });


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
// GET /api/live-classes
// exports.getLiveClasses = asyncHandler(async (req, res) => {
//   const { status, page = 1, limit = 10 } = req.query;
//   const query = {};
//   if (status) query.status = status;
//   else query.status = { $in: ['upcoming', 'live'] };

//   const skip = (page - 1) * limit;
//   const total = await LiveClass.countDocuments(query);

//   const classes = await LiveClass.find(query)
//     .populate('instructor', 'name avatar')
//     .select('-registrations -meetingUrl -meetingPassword')
//     .sort({ scheduledAt: 1 })
//     .skip(skip)
//     .limit(Number(limit));

//   let registrationMap = {};
//   if (req.user) {
//     const user = await User.findById(req.user.id).select('liveClassRegistrations');
//     user.liveClassRegistrations.forEach(r => {
//       registrationMap[r.liveClass.toString()] = true;
//     });
//   }

//   const result = classes.map(c => ({
//     ...c.toObject(),
//     isRegistered: !!registrationMap[c._id.toString()]
//   }));

//   // FIX: use "liveClasses" key to match frontend
//   return sendSuccess(res, {
//     liveClasses: result,
//     pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
//   });
// });

// // GET /api/live-classes/:id
// exports.getLiveClass = asyncHandler(async (req, res) => {
//   const liveClass = await LiveClass.findById(req.params.id)
//     .populate('instructor', 'name avatar');

//   if (!liveClass) throw new AppError('Live class not found', 404);

//   let registered = false;
//   let showMeetingUrl = false;

//   if (req.user) {
//     const user = await User.findById(req.user.id);
//     registered = user.isRegisteredForClass(liveClass._id);
//     const now = new Date();
//     const minutesUntilClass = (liveClass.scheduledAt - now) / 60000;
//     showMeetingUrl = registered && minutesUntilClass <= liveClass.urlSendMinutesBefore;
//   }

//   const data = liveClass.toObject();

//   // Keep availableSeats before deleting registrations
//   const availableSeats = Math.max(0, liveClass.maxParticipants - liveClass.registrations.length);

//   if (!showMeetingUrl) {
//     delete data.meetingUrl;
//     delete data.meetingPassword;
//   }
//   delete data.registrations;

//   // Attach computed field since virtual is gone after delete
//   data.availableSeats = availableSeats;

//   // FIX: use "registered" key to match frontend
//   return sendSuccess(res, { liveClass: data, registered, showMeetingUrl });
// });

// POST /api/live-classes/:id/register
// POST /api/live-classes/:id/register
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