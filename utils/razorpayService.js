// ============================================================
// utils/razorpayService.js — Payment helpers
// ============================================================
const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const { v4: uuidv4 } = require('uuid');

// ── Create a Razorpay order ───────────────────────────────────
const createOrder = async ({ amountInRupees, currency = 'INR', receiptPrefix = 'receipt', notes = {} }) => {
  const amountInPaise = Math.round(amountInRupees * 100);
  const receipt = `${receiptPrefix}_${uuidv4().slice(0, 8)}`;

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
    notes
  });

  return { order, receipt };
};

// ── Verify Razorpay payment signature ────────────────────────
const verifySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpaySignature;
};

// ── Save a new payment record ────────────────────────────────
const savePayment = async ({ userId, itemType, itemId, itemRef, itemTitle, order, currency }) => {
  const payment = await Payment.create({
    user: userId,
    itemType,
    itemId,
    itemRef,
    itemTitle,
    amount: order.amount,
    amountInRupees: order.amount / 100,
    currency: currency || 'INR',
    razorpayOrderId: order.id,
    status: 'created',
    receipt: order.receipt
  });
  return payment;
};

// ── Mark payment as paid after verification ──────────────────
const confirmPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) throw new Error('Invalid payment signature');

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: 'paid',
      paidAt: new Date()
    },
    { new: true }
  );

  if (!payment) throw new Error('Payment record not found');
  return payment;
};

module.exports = { createOrder, verifySignature, savePayment, confirmPayment };