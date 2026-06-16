// ============================================================
// routes/adminRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();

const {
  getPlatformStats, getUsers, getUser,
  toggleUserStatus, changeUserRole, deleteUser,
  getContentOverview, getRevenue
} = require('../controllers/adminController');

const { protect, adminOnly } = require('../middleware/auth');

// All admin routes are protected by default
router.use(protect, adminOnly);

// ── Stats ─────────────────────────────────────────────────────
router.get('/stats',            getPlatformStats);
router.get('/content-overview', getContentOverview);
router.get('/revenue',          getRevenue);

// ── User management ───────────────────────────────────────────
router.get('/users',                    getUsers);
router.get('/users/:id',                getUser);
router.patch('/users/:id/status',       toggleUserStatus);
router.patch('/users/:id/role',         changeUserRole);
router.delete('/users/:id',             deleteUser);

module.exports = router;