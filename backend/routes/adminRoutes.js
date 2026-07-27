/**
 * routes/adminRoutes.js
 */
const express = require('express');
const router  = express.Router();

const {
  loginAdmin, getMe, getDashboard,
  seedAdmin, changePassword,
} = require('../controllers/adminController');
const { protect }         = require('../middleware/auth');
const { adminLoginRules } = require('../middleware/validate');

router.post('/login',    adminLoginRules, loginAdmin);
router.get('/me',        protect, getMe);
router.get('/dashboard', protect, getDashboard);
router.patch('/password', protect, changePassword);
router.post('/seed', seedAdmin); // ⚠️ disable after first use

module.exports = router;
