/**
 * controllers/adminController.js
 * Admin auth + dashboard stats + seed
 */

const jwt     = require('jsonwebtoken');
const Admin   = require('../models/Admin');
const Booking = require('../models/Booking');
const Driver  = require('../models/Driver');
const Payment = require('../models/Payment');
const Contact = require('../models/Contact');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/** POST /api/admin/login */
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const token = signToken(admin._id);
    res.json({
      success: true, message: 'Login successful.', token,
      data: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) { next(err); }
};

/** GET /api/admin/me */
const getMe = async (req, res) => {
  res.json({ success: true, data: { id: req.admin._id, name: req.admin.name, email: req.admin.email } });
};

/** GET /api/admin/dashboard */
const getDashboard = async (req, res, next) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalBookings, todayBookings, pendingBookings,
      confirmedBookings, cancelledBookings, completedBookings,
      totalDrivers, availableDrivers,
      totalContacts, unresolvedContacts,
      revenue,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Cancelled' }),
      Booking.countDocuments({ status: 'Completed' }),
      Driver.countDocuments({ isActive: true }),
      Driver.countDocuments({ isActive: true, isAvailable: true }),
      Contact.countDocuments(),
      Contact.countDocuments({ isResolved: false }),
      Payment.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    // Recent 5 bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 }).limit(5)
      .populate('driverId', 'name phone');

    res.json({
      success: true,
      data: {
        bookings: {
          total: totalBookings, today: todayBookings,
          pending: pendingBookings, confirmed: confirmedBookings,
          cancelled: cancelledBookings, completed: completedBookings,
        },
        drivers: { total: totalDrivers, available: availableDrivers },
        contacts: { total: totalContacts, unresolved: unresolvedContacts },
        revenue: { total: revenue[0]?.total || 0 },
        recentBookings,
      },
    });
  } catch (err) { next(err); }
};

/** POST /api/admin/seed – one-time admin creation */
const seedAdmin = async (req, res, next) => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) return res.status(409).json({ success: false, message: 'Admin account already exists.' });

    const admin = await Admin.create({
      name: 'Admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
    });

    res.status(201).json({
      success: true,
      message: 'Admin created. Disable /seed route in production.',
      data: { id: admin._id, email: admin.email },
    });
  } catch (err) { next(err); }
};

module.exports = { loginAdmin, getMe, getDashboard, seedAdmin };
