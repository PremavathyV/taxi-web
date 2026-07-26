/**
 * controllers/driverController.js
 * CRUD for drivers – all protected (admin only)
 */

const Driver  = require('../models/Driver');
const Booking = require('../models/Booking');

/* ── GET all drivers ── */
const getAllDrivers = async (req, res, next) => {
  try {
    const { available, vehicleType, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (available !== undefined) filter.isAvailable = available === 'true';
    if (vehicleType) filter.vehicleType = vehicleType;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Driver.countDocuments(filter);
    const drivers = await Driver.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), data: drivers });
  } catch (err) { next(err); }
};

/* ── GET single driver ── */
const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.json({ success: true, data: driver });
  } catch (err) { next(err); }
};

/* ── CREATE driver ── */
const createDriver = async (req, res, next) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json({ success: true, message: 'Driver added successfully.', data: driver });
  } catch (err) { next(err); }
};

/* ── UPDATE driver ── */
const updateDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.json({ success: true, message: 'Driver updated.', data: driver });
  } catch (err) { next(err); }
};

/* ── DELETE driver (soft) ── */
const deleteDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
    res.json({ success: true, message: 'Driver removed.' });
  } catch (err) { next(err); }
};

/* ── GET driver's booking history ── */
const getDriverBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ driverId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

module.exports = { getAllDrivers, getDriverById, createDriver, updateDriver, deleteDriver, getDriverBookings };
