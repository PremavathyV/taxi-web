/**
 * middleware/validate.js
 * express-validator rules for all routes
 */

const { body, validationResult } = require('express-validator');

/* ── Run validation result ── */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/* ── Booking rules ── */
const bookingRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters.')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters.'),

  body('mobile').trim().notEmpty().withMessage('Mobile number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number.'),

  body('pickup').trim().notEmpty().withMessage('Pickup location is required.'),

  body('drop').trim().notEmpty().withMessage('Drop location is required.')
    .custom((drop, { req }) => {
      if (drop.toLowerCase() === (req.body.pickup || '').toLowerCase())
        throw new Error('Pickup and drop locations cannot be the same.');
      return true;
    }),

  body('journeyDate').notEmpty().withMessage('Journey date is required.')
    .isISO8601().withMessage('Invalid date format.')
    .custom(date => {
      const selected = new Date(date);
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      if (selected < today) throw new Error('Journey date cannot be in the past.');
      return true;
    }),

  body('pickupTime').notEmpty().withMessage('Pickup time is required.')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM.'),

  body('vehicleType').notEmpty().withMessage('Vehicle type is required.')
    .isIn(['Sedan (Toyota Etios / Dzire)', 'SUV (Mahindra XUV / Ertiga)', 'Innova'])
    .withMessage('Invalid vehicle type.'),

  handleValidation,
];

/* ── Admin login rules ── */
const adminLoginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidation,
];

/* ── Driver rules ── */
const driverRules = [
  body('name').trim().notEmpty().withMessage('Driver name is required.'),
  body('phone').trim().notEmpty().withMessage('Phone is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number.'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required.'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required.')
    .isIn(['Sedan (Toyota Etios / Dzire)', 'SUV (Mahindra XUV / Ertiga)', 'Innova'])
    .withMessage('Invalid vehicle type.'),
  handleValidation,
];

/* ── Contact rules ── */
const contactRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('message').trim().notEmpty().withMessage('Message is required.'),
  handleValidation,
];

module.exports = { bookingRules, adminLoginRules, driverRules, contactRules };
