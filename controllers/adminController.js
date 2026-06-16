const User = require('../models/User');
const Course = require('../models/Course');
const Notes = require('../models/Notes');
const LiveClass = require('../models/LiveClass');
const Payment = require('../models/Payment');
const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');
exports.getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalStudents,
    totalAdmins,
    totalCourses,
    publishedCourses,
    totalLiveClasses,
    upcomingClasses,
    totalNotes,
    revenueData,
    recentPayments,
    newUsersThisMonth,
    revenueByMonth
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    LiveClass.countDocuments(),
    LiveClass.countDocuments({ status: 'upcoming' }),
    Notes.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amountInRupees' }, count: { $sum: 1 } } }
    ]),
    Payment.find({ status: 'paid' })
      .populate('user', 'name email')
      .sort({ paidAt: -1 })
      .limit(5),
    User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    }),
    Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          revenue: { $sum: '$amountInRupees' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);
  return sendSuccess(res, {
    stats: {
      users: { total: totalUsers, students: totalStudents, admins: totalAdmins, newThisMonth: newUsersThisMonth },
      courses: { total: totalCourses, published: publishedCourses },
      liveClasses: { total: totalLiveClasses, upcoming: upcomingClasses },
      notes: { total: totalNotes },
      revenue: {
        total: revenueData[0]?.totalRevenue || 0,
        transactions: revenueData[0]?.count || 0
      }
    },
    recentPayments,
    revenueByMonth
  });
});

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

// GET /api/admin/users — list all users with pagination
exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, isActive } = req.query;
  const query = {};

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await User.countDocuments(query);

  const users = await User.find(query)
    .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return sendSuccess(res, {
    users,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
  });
});

// GET /api/admin/users/:id — single user details with purchase history
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('purchasedCourses.course', 'title price')
    .populate('purchasedNotes.notes', 'title price')
    .populate('liveClassRegistrations.liveClass', 'title scheduledAt');

  if (!user) throw new AppError('User not found', 404);

  const payments = await Payment.find({ user: req.params.id, status: 'paid' })
    .sort({ paidAt: -1 });

  return sendSuccess(res, { user, payments });
});

// PATCH /api/admin/users/:id/status — activate/deactivate user
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  // Prevent deactivating own account
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  user.isActive = !user.isActive;
  await user.save();

  return sendSuccess(res, { isActive: user.isActive },
    `User ${user.isActive ? 'activated' : 'deactivated'}`);
});

// PATCH /api/admin/users/:id/role — change user role
exports.changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['student', 'admin'].includes(role)) throw new AppError('Invalid role', 400);

  const user = await User.findByIdAndUpdate(
    req.params.id, { role }, { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);
  return sendSuccess(res, { user }, 'Role updated');
});

// DELETE /api/admin/users/:id — delete user
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user._id.toString() === req.user.id.toString()) {
    throw new AppError('You cannot delete your own account', 400);
  }
  await user.deleteOne();
  return sendSuccess(res, {}, 'User deleted');
});

// ─────────────────────────────────────────────────────────────
// CONTENT MANAGEMENT (quick-access admin views)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/content-overview
exports.getContentOverview = asyncHandler(async (req, res) => {
  const [courses, liveClasses, notes] = await Promise.all([
    Course.find()
      .populate('instructor', 'name')
      .select('title isPublished totalStudents totalRevenue createdAt')
      .sort({ createdAt: -1 })
      .limit(10),
    LiveClass.find()
      .populate('instructor', 'name')
      .select('title status scheduledAt registrationCount createdAt')
      .sort({ scheduledAt: -1 })
      .limit(10),
    Notes.find()
      .select('title isPublished totalPurchases totalRevenue createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
  ]);

  return sendSuccess(res, { courses, liveClasses, notes });
});

// ─────────────────────────────────────────────────────────────
// REVENUE ANALYTICS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/revenue — detailed revenue breakdown
exports.getRevenue = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const matchQuery = { status: 'paid' };

  if (from || to) {
    matchQuery.paidAt = {};
    if (from) matchQuery.paidAt.$gte = new Date(from);
    if (to) matchQuery.paidAt.$lte = new Date(to);
  }

  const [byType, byDay, topCourses] = await Promise.all([
    Payment.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$itemType', revenue: { $sum: '$amountInRupees' }, count: { $sum: 1 } } }
    ]),
    Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          revenue: { $sum: '$amountInRupees' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Course.find()
      .select('title totalRevenue totalStudents')
      .sort({ totalRevenue: -1 })
      .limit(5)
  ]);

  return sendSuccess(res, { byType, byDay, topCourses });
});