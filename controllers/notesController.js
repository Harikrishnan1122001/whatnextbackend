// // ============================================================
// // controllers/notesController.js
// // ============================================================
// const Notes = require('../models/Notes');
// const User = require('../models/User');
// const path = require('path');
// const fs = require('fs');
// const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');

// // ─────────────────────────────────────────────────────────────
// // PUBLIC / STUDENT ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // GET /api/notes — list published notes
// exports.getNotes = asyncHandler(async (req, res) => {
//   const { course, search, page = 1, limit = 12 } = req.query;
//   const query = { isPublished: true };

//   if (course) query.course = course;
//   if (search) query.$text = { $search: search };

//   const skip = (page - 1) * limit;
//   const total = await Notes.countDocuments(query);

//   const notes = await Notes.find(query)
//     .populate('course', 'title')
//     .populate('uploadedBy', 'name')
//     .select('-fileUrl')  // hide actual file URL for non-purchasers
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(Number(limit));

//   return sendSuccess(res, {
//     notes,
//     pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
//   });
// });

// // GET /api/notes/:id — single notes details
// exports.getNote = asyncHandler(async (req, res) => {
//   const note = await Notes.findById(req.params.id)
//     .populate('course', 'title')
//     .populate('uploadedBy', 'name');

//   if (!note || !note.isPublished) throw new AppError('Notes not found', 404);

//   let hasPurchased = false;
//   if (req.user) {
//     const user = await User.findById(req.user.id);
//     hasPurchased = user.hasPurchasedNotes(note._id) || note.isFree;
//   }

//   const data = note.toObject();
//   if (!hasPurchased) {
//     delete data.fileUrl;   // don't expose the actual download link
//   }

//   return sendSuccess(res, { note: data, hasPurchased });
// });

// // GET /api/notes/:id/download — download if purchased
// exports.downloadNote = asyncHandler(async (req, res) => {
//   const note = await Notes.findById(req.params.id);
//   if (!note || !note.isPublished) throw new AppError('Notes not found', 404);

//   // Check access
//   if (!note.isFree) {
//     if (!req.user) throw new AppError('Login required', 401);
//     const user = await User.findById(req.user.id);
//     if (!user.hasPurchasedNotes(note._id) && req.user.role !== 'admin') {
//       throw new AppError('Purchase these notes to download', 403);
//     }
//   }

//   // Build absolute path and stream the file
//   const filePath = path.join(__dirname, '..', note.fileUrl);
//   if (!fs.existsSync(filePath)) throw new AppError('File not found on server', 404);

//   const filename = `${note.title}.${note.fileType}`;
//   res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
//   res.setHeader('Content-Type', 'application/octet-stream');
//   fs.createReadStream(filePath).pipe(res);
// });

// // ─────────────────────────────────────────────────────────────
// // ADMIN ENDPOINTS
// // ─────────────────────────────────────────────────────────────

// // GET /api/notes/admin/all — all notes
// exports.getAllNotesAdmin = asyncHandler(async (req, res) => {
//   const notes = await Notes.find()
//     .populate('course', 'title')
//     .populate('uploadedBy', 'name email')
//     .sort({ createdAt: -1 });

//   return sendSuccess(res, { notes });
// });

// // POST /api/notes — upload notes document
// exports.createNotes = asyncHandler(async (req, res) => {
//   if (!req.file) throw new AppError('Document file is required', 400);

//   const {
//     title, description, price, discountPrice,
//     isFree, course, tags, category, previewPages
//   } = req.body;

//   const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
//   const fileUrl = `/uploads/documents/${req.file.filename}`;

//   const notes = await Notes.create({
//     title,
//     description,
//     fileUrl,
//     fileType: ext,
//     fileSizeBytes: req.file.size,
//     price: Number(price) || 0,
//     discountPrice: discountPrice ? Number(discountPrice) : null,
//     isFree: isFree === 'true' || isFree === true || Number(price) === 0,
//     course: course || null,
//     tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
//     category,
//     previewPages: Number(previewPages) || 0,
//     uploadedBy: req.user.id,
//     thumbnail: req.files && req.files.thumbnail
//       ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}`
//       : null
//   });

//   return sendSuccess(res, { notes }, 'Notes uploaded', 201);
// });

// // PUT /api/notes/:id — update notes metadata
// exports.updateNotes = asyncHandler(async (req, res) => {
//   const note = await Notes.findById(req.params.id);
//   if (!note) throw new AppError('Notes not found', 404);

//   const updates = { ...req.body };
//   if (updates.price) updates.price = Number(updates.price);
//   if (updates.discountPrice) updates.discountPrice = Number(updates.discountPrice);

//   // Re-upload file
//   if (req.file) {
//     updates.fileUrl = `/uploads/documents/${req.file.filename}`;
//     updates.fileSizeBytes = req.file.size;
//     const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
//     updates.fileType = ext;
//   }

//   const updated = await Notes.findByIdAndUpdate(req.params.id, updates, {
//     new: true, runValidators: true
//   });

//   return sendSuccess(res, { notes: updated }, 'Notes updated');
// });

// // DELETE /api/notes/:id — delete notes
// exports.deleteNotes = asyncHandler(async (req, res) => {
//   const note = await Notes.findById(req.params.id);
//   if (!note) throw new AppError('Notes not found', 404);

//   // Optionally delete the physical file
//   const filePath = path.join(__dirname, '..', note.fileUrl);
//   if (fs.existsSync(filePath)) {
//     fs.unlinkSync(filePath);
//   }

//   await note.deleteOne();
//   return sendSuccess(res, {}, 'Notes deleted');
// });

// // PATCH /api/notes/:id/toggle-publish
// exports.togglePublish = asyncHandler(async (req, res) => {
//   const note = await Notes.findById(req.params.id);
//   if (!note) throw new AppError('Notes not found', 404);

//   note.isPublished = !note.isPublished;
//   await note.save();

//   return sendSuccess(res, { isPublished: note.isPublished },
//     `Notes ${note.isPublished ? 'published' : 'unpublished'}`);
// });




// ============================================================
// controllers/notesController.js
// ============================================================
const Notes = require('../models/Notes');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');

// helper: accept both comma-string and array
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
};

// ─────────────────────────────────────────────────────────────
// PUBLIC / STUDENT ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/notes
exports.getNotes = asyncHandler(async (req, res) => {
  const { course, search, page = 1, limit = 12 } = req.query;
  const query = { isPublished: true };

  if (course) query.course = course;
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const total = await Notes.countDocuments(query);

  const notes = await Notes.find(query)
    .populate('course', 'title')
    .populate('uploadedBy', 'name')
    .select('-fileUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return sendSuccess(res, {
    notes,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
  });
});

// GET /api/notes/:id
exports.getNote = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id)
    .populate('course', 'title')
    .populate('uploadedBy', 'name');

  if (!note || !note.isPublished) throw new AppError('Notes not found', 404);

  // FIX: field name is "purchased" to match frontend
  let purchased = false;
  if (req.user) {
    const user = await User.findById(req.user.id);
    purchased = user.hasPurchasedNotes(note._id) || note.isFree;
  } else if (note.isFree) {
    purchased = true;
  }

  const data = note.toObject();
  if (!purchased) {
    delete data.fileUrl;
  }

  return sendSuccess(res, { note: data, purchased });
});

// GET /api/notes/:id/download
exports.downloadNote = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note || !note.isPublished) throw new AppError('Notes not found', 404);

  // Support token in query string (for window.open downloads)
  // req.user is set by auth middleware via Authorization header OR query token
  if (!note.isFree) {
    if (!req.user) throw new AppError('Login required', 401);
    const user = await User.findById(req.user.id);
    if (!user.hasPurchasedNotes(note._id) && req.user.role !== 'admin') {
      throw new AppError('Purchase these notes to download', 403);
    }
  }

  const filePath = path.join(__dirname, '..', note.fileUrl);
  if (!fs.existsSync(filePath)) throw new AppError('File not found on server', 404);

  const filename = `${note.title}.${note.fileType}`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Increment download count asynchronously
  Notes.findByIdAndUpdate(note._id, { $inc: { totalPurchases: 0 } }).catch(() => {});

  fs.createReadStream(filePath).pipe(res);
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/notes/admin/all
exports.getAllNotesAdmin = asyncHandler(async (req, res) => {
  const notes = await Notes.find()
    .populate('course', 'title')
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

  return sendSuccess(res, { notes });
});

// POST /api/notes
exports.createNotes = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Document file is required', 400);

  const {
    title, description, price, discountPrice,
    isFree, course, tags, category, previewPages
  } = req.body;

  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  const fileUrl = `/uploads/documents/${req.file.filename}`;
  const priceNum = Number(price) || 0;

  const notes = await Notes.create({
    title,
    description,
    fileUrl,
    fileType: ext || 'pdf',
    fileSizeBytes: req.file.size,
    price: priceNum,
    discountPrice: discountPrice ? Number(discountPrice) : null,
    isFree: isFree === 'true' || isFree === true || priceNum === 0,
    course: course || null,
    tags: toArray(tags),
    category,
    previewPages: Number(previewPages) || 0,
    uploadedBy: req.user.id,
    thumbnail: req.files && req.files.thumbnail
      ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}`
      : null
  });

  return sendSuccess(res, { notes }, 'Notes uploaded', 201);
});

// PUT /api/notes/:id
exports.updateNotes = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note) throw new AppError('Notes not found', 404);

  const updates = { ...req.body };
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.discountPrice !== undefined) updates.discountPrice = updates.discountPrice ? Number(updates.discountPrice) : null;
  if (updates.tags !== undefined) updates.tags = toArray(updates.tags);
  if (updates.isFree !== undefined) updates.isFree = updates.isFree === 'true' || updates.isFree === true;

  if (req.file) {
    updates.fileUrl = `/uploads/documents/${req.file.filename}`;
    updates.fileSizeBytes = req.file.size;
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    updates.fileType = ext || 'pdf';
  }

  const updated = await Notes.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

  return sendSuccess(res, { notes: updated }, 'Notes updated');
});

// DELETE /api/notes/:id
exports.deleteNotes = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note) throw new AppError('Notes not found', 404);

  const filePath = path.join(__dirname, '..', note.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await note.deleteOne();
  return sendSuccess(res, {}, 'Notes deleted');
});

// PATCH /api/notes/:id/toggle-publish
exports.togglePublish = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note) throw new AppError('Notes not found', 404);

  note.isPublished = !note.isPublished;
  await note.save();

  return sendSuccess(res, { isPublished: note.isPublished },
    `Notes ${note.isPublished ? 'published' : 'unpublished'}`);
});