// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getMyPayments,
  getAllPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// All payment routes require login
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/my', getMyPayments);

// Admin only
router.get('/admin/all', authorize('admin'), getAllPayments);

module.exports = router;