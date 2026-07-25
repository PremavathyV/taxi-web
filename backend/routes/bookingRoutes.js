/**
 * routes/bookingRoutes.js
 *
 * Public:
 *   POST   /api/bookings          – create booking
 *
 * Protected (admin JWT required):
 *   GET    /api/bookings          – list all bookings
 *   GET    /api/bookings/:id      – single booking
 *   PATCH  /api/bookings/:id      – update status / note
 *   DELETE /api/bookings/:id      – delete booking
 */

const express  = require('express');
const router   = express.Router();

const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookingController');

const { protect }       = require('../middleware/auth');
const { bookingRules }  = require('../middleware/validate');

// ── Public ──────────────────────────────────────────────────
router.post('/', bookingRules, createBooking);

// ── Protected (admin only) ───────────────────────────────────
router.use(protect); // all routes below require JWT

router.get('/',     getAllBookings);
router.get('/:id',  getBookingById);
router.patch('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
