/**
 * routes/adminRoutes.js
 *
 *   POST  /api/admin/login   – login, returns JWT
 *   GET   /api/admin/me      – logged-in admin profile (protected)
 *   POST  /api/admin/seed    – one-time admin creation (disable after use)
 */

const express  = require('express');
const router   = express.Router();

const { loginAdmin, getMe, seedAdmin } = require('../controllers/adminController');
const { protect }                      = require('../middleware/auth');
const { adminLoginRules }              = require('../middleware/validate');

router.post('/login', adminLoginRules, loginAdmin);
router.get('/me',     protect, getMe);

// ⚠️  Seed route – use once, then comment out or remove in production
router.post('/seed', seedAdmin);

module.exports = router;
