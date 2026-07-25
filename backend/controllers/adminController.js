/**
 * controllers/adminController.js
 * Admin authentication – login + seed
 */

const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');

/* ── Sign JWT ── */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/admin/login
 * Authenticate admin and return JWT
 */
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find admin with password (select:false by default)
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(admin._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      data: {
        id:    admin._id,
        name:  admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/me
 * Return currently logged-in admin profile
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      id:        req.admin._id,
      name:      req.admin.name,
      email:     req.admin.email,
      createdAt: req.admin.createdAt,
    },
  });
};

/**
 * POST /api/admin/seed
 * One-time admin account creation (disable in production after use)
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from .env
 */
const seedAdmin = async (req, res, next) => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Admin account already exists.',
      });
    }

    const admin = await Admin.create({
      name:     'Admin',
      email:    process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created. Disable /seed route in production.',
      data: { id: admin._id, email: admin.email },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { loginAdmin, getMe, seedAdmin };
