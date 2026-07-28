/**
 * controllers/bookingController.js
 * Public: create booking
 * Protected: admin CRUD + assign driver + reports
 */

const Booking = require('../models/Booking');
const Driver  = require('../models/Driver');
const Payment = require('../models/Payment');
const { sendCustomerConfirmation, sendAdminNotification } = require('../utils/mailer');

/* ══════════════════════════════════════
   PUBLIC
   ══════════════════════════════════════ */

/** POST /api/bookings – customer submits booking */
const createBooking = async (req, res, next) => {
  try {
    const {
      name, mobile, email, pickup, drop, journeyDate,
      pickupTime, vehicleType, tripType, specialInstructions,
    } = req.body;

    const booking = await Booking.create({
      name, mobile, email: email || '',
      pickup, drop,
      journeyDate: new Date(journeyDate),
      pickupTime, vehicleType,
      tripType:            tripType            || 'one_way',
      specialInstructions: specialInstructions || '',
      status: 'Pending',
    });

    // Send emails non-blocking — customer email if email provided
    Promise.allSettled([
      sendAdminNotification(booking),
      email ? sendCustomerConfirmation(booking) : Promise.resolve(),
    ]).then(results => {
      results.forEach(r => { if (r.status === 'rejected') console.error('📧 Email error:', r.reason?.message); });
    });

    return res.status(201).json({
      success: true,
      message: 'Booking Submitted Successfully! We will contact you shortly.',
      data: {
        bookingId: booking._id,
        name:      booking.name,
        status:    booking.status,
        createdAt: booking.createdAt,
      },
    });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════
   ADMIN – CRUD
   ══════════════════════════════════════ */

/** GET /api/bookings – list with filters + search + pagination */
const getAllBookings = async (req, res, next) => {
  try {
    const { status, date, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end   = new Date(date); end.setHours(23,59,59,999);
      filter.journeyDate = { $gte: start, $lte: end };
    }

    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { mobile: re }, { pickup: re }, { drop: re }];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Booking.countDocuments(filter);
    const data  = await Booking.find(filter)
      .populate('driverId', 'name phone vehicleNumber vehicleType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data });
  } catch (err) { next(err); }
};

/** GET /api/bookings/:id */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('driverId', 'name phone vehicleNumber vehicleType');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const payment = await Payment.findOne({ bookingId: booking._id });
    res.json({ success: true, data: { ...booking.toObject(), payment: payment || null } });
  } catch (err) { next(err); }
};

/** PATCH /api/bookings/:id – update status / note / fare */
const updateBooking = async (req, res, next) => {
  try {
    const allowed = ['status', 'adminNote', 'cancelReason', 'estimatedFare', 'tripType', 'specialInstructions'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (!Object.keys(updates).length)
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).populate('driverId', 'name phone vehicleNumber');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, message: 'Booking updated.', data: booking });
  } catch (err) { next(err); }
};

/** PATCH /api/bookings/:id/assign-driver */
const assignDriver = async (req, res, next) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    if (!driver.isAvailable)
      return res.status(400).json({ success: false, message: 'Driver is not available.' });

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { driverId, status: 'Confirmed' },
      { new: true }
    ).populate('driverId', 'name phone vehicleNumber vehicleType');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Mark driver as unavailable
    await Driver.findByIdAndUpdate(driverId, { isAvailable: false });

    res.json({ success: true, message: `Driver ${driver.name} assigned.`, data: booking });
  } catch (err) { next(err); }
};

/** DELETE /api/bookings/:id */
const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    await Payment.deleteOne({ bookingId: req.params.id });
    res.json({ success: true, message: 'Booking deleted.' });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════
   REPORTS
   ══════════════════════════════════════ */

/** GET /api/bookings/reports */
const getReports = async (req, res, next) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalBookings, todayBookings, weekBookings, monthBookings,
      pendingCount, confirmedCount, cancelledCount, completedCount,
      byVehicle,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ createdAt: { $gte: weekStart } }),
      Booking.countDocuments({ createdAt: { $gte: monthStart } }),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Cancelled' }),
      Booking.countDocuments({ status: 'Completed' }),
      Booking.aggregate([
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalBookings, todayBookings, weekBookings, monthBookings,
        byStatus: { pending: pendingCount, confirmed: confirmedCount, cancelled: cancelledCount, completed: completedCount },
        byVehicle,
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  createBooking, getAllBookings, getBookingById,
  updateBooking, assignDriver, deleteBooking, getReports,
};
