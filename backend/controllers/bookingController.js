/**
 * controllers/bookingController.js
 * Handles customer booking creation and admin CRUD
 */

const Booking = require('../models/Booking');
const { sendCustomerConfirmation, sendAdminNotification } = require('../utils/mailer');

/* ─────────────────────────────────────────────────────────────
   PUBLIC
   ───────────────────────────────────────────────────────────── */

/**
 * POST /api/bookings
 * Create a new booking
 */
const createBooking = async (req, res, next) => {
  try {
    const { name, mobile, pickup, drop, journeyDate, pickupTime, vehicleType } = req.body;

    const booking = await Booking.create({
      name,
      mobile,
      pickup,
      drop,
      journeyDate: new Date(journeyDate),
      pickupTime,
      vehicleType,
      status: 'Pending',
    });

    // Send emails (non-blocking — don't fail booking if email fails)
    Promise.allSettled([
      sendAdminNotification(booking),
      // sendCustomerConfirmation(booking), // enable when customer email field is added
    ]).then(results => {
      results.forEach(r => {
        if (r.status === 'rejected') {
          console.error('📧 Email error:', r.reason?.message);
        }
      });
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
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────
   ADMIN (protected)
   ───────────────────────────────────────────────────────────── */

/**
 * GET /api/bookings
 * List all bookings (newest first) with optional status filter
 */
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      total,
      page:    parseInt(page),
      pages:   Math.ceil(total / parseInt(limit)),
      data:    bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/:id
 * Get single booking by ID
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/bookings/:id
 * Update booking status or admin note
 */
const updateBooking = async (req, res, next) => {
  try {
    const allowed = ['status', 'adminNote'];
    const updates = {};

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      });
    }

    // Validate status value if provided
    const validStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return res.status(422).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking updated successfully.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/bookings/:id
 * Delete a booking permanently
 */
const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};
