// ============================================================
// utils/errorHandler.js — Custom errors + async wrapper
// ============================================================

// ── Custom error class with HTTP status ───────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Async wrapper to avoid try/catch in every controller ─────
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Standard success response helper ─────────────────────────
const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, ...data });
};

// ── Standard error response helper ───────────────────────────
const sendError = (res, message = 'Error', statusCode = 400, extras = {}) => {
  return res.status(statusCode).json({ success: false, message, ...extras });
};

// ── Mongoose duplicate key error ──────────────────────────────
const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 400);
};

// ── Mongoose cast error ───────────────────────────────────────
const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

// ── Global error handler middleware ──────────────────────────
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join(', ');
    error = new AppError(msg, 422);
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { AppError, asyncHandler, sendSuccess, sendError, globalErrorHandler };