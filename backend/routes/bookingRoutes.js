/**
 * routes/bookingRoutes.js
 * Public:    POST   /api/bookings
 * Protected: GET    /api/bookings
 *            GET    /api/bookings/reports
 *            GET    /api/bookings/:id
 *            PATCH  /api/bookings/:id
 *            PATCH  /api/bookings/:id/assign-driver
 *            DELETE /api/bookings/:id
 */

const express = require('express');
const router  = express.Router();

const {
  createBooking, getAllBookings, getBookingById,
  updateBooking, assignDriver, deleteBooking, getReports,
} = require('../controllers/bookingController');

const { protect }      = require('../middleware/auth');
const { bookingRules } = require('../middleware/validate');

// Public
router.post('/', bookingRules, createBooking);

// Protected
router.use(protect);
router.get('/reports', getReports);
router.get('/',       getAllBookings);
router.get('/:id',    getBookingById);
router.patch('/:id/assign-driver', assignDriver);
router.patch('/:id',  updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
