/**
 * routes/adminRoutes.js
 * POST  /api/admin/login
 * GET   /api/admin/me         (protected)
 * GET   /api/admin/dashboard  (protected)
 * POST  /api/admin/seed       (⚠️ disable after first use)
 */

const express = require('express');
const router  = express.Router();

const { loginAdmin, getMe, getDashboard, seedAdmin } = require('../controllers/adminController');
const { protect }       = require('../middleware/auth');
const { adminLoginRules } = require('../middleware/validate');

router.post('/login', adminLoginRules, loginAdmin);
router.get('/me',        protect, getMe);
router.get('/dashboard', protect, getDashboard);
router.post('/seed', seedAdmin); // ⚠️ remove/comment after seeding

module.exports = router;
