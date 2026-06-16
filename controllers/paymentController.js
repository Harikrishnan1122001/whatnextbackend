// controllers/paymentController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Notes = require('../models/Notes');
const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const { asyncHandler, AppError, sendSuccess } = require('../utils/errorHandler');

// Init Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── helpers ─────────────────────────────────────────────────

// Map itemType → Mongoose model + itemRef string
const getItemModel = (itemType) => {
  const map = {
    course:     { Model: Course,    itemRef: 'Course'    },
    notes:      { Model: Notes,     itemRef: 'Notes'     },
    live_class: { Model: LiveClass, itemRef: 'LiveClass' },
  };
  return map[itemType] || null;
};

// ─────────────────────────────────────────────────────────────
// POST /api/payments/create-order
// ─────────────────────────────────────────────────────────────
// exports.createOrder = asyncHandler(async (req, res) => {
//   const { itemType, itemId } = req.body;

//   if (!itemType || !itemId) throw new AppError('itemType and itemId are required', 400);

//   const mapping = getItemModel(itemType);
//   if (!mapping) throw new AppError(`Unknown itemType: ${itemType}`, 400);

//   const item = await mapping.Model.findById(itemId);
//   if (!item) throw new AppError(`${itemType} not found`, 404);

//   // Check if already purchased
//   const user = await User.findById(req.user.id);

//   if (itemType === 'course' && user.hasPurchasedCourse?.(itemId)) {
//     throw new AppError('You already own this course', 400);
//   }
//   if (itemType === 'notes' && user.hasPurchasedNotes?.(itemId)) {
//     throw new AppError('You already own these notes', 400);
//   }
//   if (itemType === 'live_class') {
//     const alreadyReg = (user.liveClassRegistrations || []).some(
//       r => r.liveClass?.toString() === itemId.toString()
//     );
//     if (alreadyReg) throw new AppError('You are already registered for this class', 400);
//   }

//   // Determine price
//   let priceInRupees = 0;
//   if (itemType === 'course') {
//     if (item.isFree) throw new AppError('This course is free — no payment needed', 400);
//     priceInRupees = item.discountPrice ?? item.price;
//   } else if (itemType === 'notes') {
//     if (item.isFree) throw new AppError('These notes are free — no payment needed', 400);
//     priceInRupees = item.discountPrice ?? item.price;
//   } else if (itemType === 'live_class') {
//     if (item.isFree) throw new AppError('This class is free — register without payment', 400);
//     priceInRupees = item.price;
//   }

//   if (!priceInRupees || priceInRupees <= 0) {
//     throw new AppError('Invalid price for this item', 400);
//   }

//   const amountInPaise = Math.round(priceInRupees * 100);
//   const receipt = `rcpt_${itemType}_${Date.now()}`.slice(0, 40);

//   // Create Razorpay order
//   const order = await razorpay.orders.create({
//     amount: amountInPaise,
//     currency: 'INR',
//     receipt,
//     notes: {
//       itemType,
//       itemId: itemId.toString(),
//       userId: req.user.id,
//     },
//   });

//   // Save pending payment
//   await Payment.create({
//     user: req.user.id,
//     itemType,
//     itemId,
//     itemRef: mapping.itemRef,
//     itemTitle: item.title,
//     amount: amountInPaise,
//     amountInRupees: priceInRupees,
//     currency: 'INR',
//     razorpayOrderId: order.id,
//     receipt,
//     status: 'created',
//   });

//   return sendSuccess(res, {
//     order,
//     razorpayKeyId: process.env.RAZORPAY_KEY_ID,
//   }, 'Order created');
// });
// POST /api/payments/create-order
exports.createOrder = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;

  let item, amount, title;

  if (itemType === 'course') {
    item = await Course.findById(itemId);
    if (!item) throw new AppError('Course not found', 404);
    if (item.isFree) throw new AppError('This course is free', 400);
    amount = (item.discountPrice ?? item.price) * 100; // paise
    title = item.title;

  } else if (itemType === 'notes') {
    item = await Notes.findById(itemId);   // or Note — match your model name
    if (!item) throw new AppError('Notes not found', 404);
    if (item.isFree) throw new AppError('These notes are free', 400);
    amount = (item.discountPrice ?? item.price) * 100;
    title = item.title;

  } else if (itemType === 'liveClass') {           // ← ADD THIS BLOCK
    item = await LiveClass.findById(itemId);
    if (!item) throw new AppError('Live class not found', 404);
    if (item.isFree) throw new AppError('This class is free', 400);
    if (item.status === 'completed' || item.status === 'cancelled') {
      throw new AppError(`Cannot pay for a ${item.status} class`, 400);
    }
    // Check not already registered
    const alreadyRegistered = item.registrations.some(
      r => r.user?.toString() === req.user._id.toString()
    );
    if (alreadyRegistered) throw new AppError('Already registered', 400);
    amount = item.price * 100;
    title = item.title;

  } else {
    throw new AppError('Invalid item type', 400);  // ← this is what's firing now
  }

  // Create Razorpay order — this part is unchanged
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `rcpt_${itemType}_${itemId}`.slice(0, 40),
    notes: { itemType, itemId: itemId.toString(), userId: req.user._id.toString() }
  });

  return sendSuccess(res, {
    order,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID
  });
});
// ─────────────────────────────────────────────────────────────
// POST /api/payments/verify
// ─────────────────────────────────────────────────────────────
// exports.verifyPayment = asyncHandler(async (req, res) => {
//   const {
//     razorpayOrderId,
//     razorpayPaymentId,
//     razorpaySignature,
//     itemType,
//     itemId,
//   } = req.body;

//   if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
//     throw new AppError('Missing Razorpay payment details', 400);
//   }

//   // Verify signature
//   const expectedSig = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//     .digest('hex');

//   if (expectedSig !== razorpaySignature) {
//     // Mark payment failed
//     await Payment.findOneAndUpdate(
//       { razorpayOrderId },
//       { status: 'failed', failureReason: 'Signature mismatch' }
//     );
//     throw new AppError('Payment verification failed — invalid signature', 400);
//   }

//   // Update payment record
//   const payment = await Payment.findOneAndUpdate(
//     { razorpayOrderId },
//     {
//       razorpayPaymentId,
//       razorpaySignature,
//       status: 'paid',
//       paidAt: new Date(),
//     },
//     { new: true }
//   );

//   if (!payment) throw new AppError('Payment record not found', 404);

//   // Grant access to the item
//   const user = await User.findById(req.user.id);

//   if (itemType === 'course') {
//     const alreadyHas = (user.purchasedCourses || []).some(
//       p => p.course?.toString() === itemId.toString()
//     );
//     if (!alreadyHas) {
//       user.purchasedCourses = user.purchasedCourses || [];
//       user.purchasedCourses.push({ course: itemId, purchasedAt: new Date(), amountPaid: payment.amountInRupees });
//       await user.save();

//       // Increment course student count
//       await Course.findByIdAndUpdate(itemId, {
//         $inc: { totalStudents: 1, totalRevenue: payment.amountInRupees }
//       });
//     }
//   } else if (itemType === 'notes') {
//     const alreadyHas = (user.purchasedNotes || []).some(
//       p => p.notes?.toString() === itemId.toString()
//     );
//     if (!alreadyHas) {
//       user.purchasedNotes = user.purchasedNotes || [];
//       user.purchasedNotes.push({ notes: itemId, purchasedAt: new Date(), amountPaid: payment.amountInRupees });
//       await user.save();

//       await Notes.findByIdAndUpdate(itemId, { $inc: { totalPurchases: 1 } });
//     }
//   } else if (itemType === 'live_class') {
//     const liveClass = await LiveClass.findById(itemId);
//     if (!liveClass) throw new AppError('Live class not found', 404);

//     const alreadyReg = liveClass.registrations.some(
//       r => r.user?.toString() === req.user.id.toString()
//     );
//     if (!alreadyReg) {
//       liveClass.registrations.push({
//         user: req.user.id,
//         paymentId: razorpayPaymentId,
//         amountPaid: payment.amountInRupees,
//       });
//       await liveClass.save();

//       user.liveClassRegistrations = user.liveClassRegistrations || [];
//       user.liveClassRegistrations.push({ liveClass: itemId, registeredAt: new Date() });
//       await user.save();
//     }
//   }

//   return sendSuccess(res, { payment }, 'Payment successful! Access granted.');
// });
// POST /api/payments/verify
exports.verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
    itemType, itemId
  } = req.body;

  // ── Signature verification (unchanged) ──────────────────────
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new AppError('Payment verification failed', 400);
  }

  // ── Record payment (your existing Payment.create call) ──────
  // ... keep whatever you have here ...

  // ── Grant access based on itemType ──────────────────────────
  if (itemType === 'course') {
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        purchasedCourses: { course: itemId, purchasedAt: new Date() }
      }
    });

  } else if (itemType === 'notes') {
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        purchasedNotes: { notes: itemId, purchasedAt: new Date() }
      }
    });

  } else if (itemType === 'liveClass') {           // ← ADD THIS BLOCK
    // Add to LiveClass.registrations[]
    await LiveClass.findByIdAndUpdate(itemId, {
      $push: {
        registrations: {
          user: req.user._id,
          registeredAt: new Date(),
          amountPaid: 0  // or pull from payment record
        }
      }
    });

    // Mirror on User document so dashboard tab works
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        liveClassRegistrations: {
          liveClass: itemId,
          registeredAt: new Date(),
          urlSent: false
        }
      }
    });
  }

  return sendSuccess(res, {}, 'Payment verified successfully');
});
// ─────────────────────────────────────────────────────────────
// GET /api/payments/my   — current user's payment history
// ─────────────────────────────────────────────────────────────
exports.getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, { payments });
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/admin/all   — admin: all payments
// ─────────────────────────────────────────────────────────────
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  const query = status ? { status } : {};

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Payment.countDocuments(query);

  const payments = await Payment.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  return sendSuccess(res, {
    payments,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});