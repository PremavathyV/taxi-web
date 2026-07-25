/**
 * models/Booking.js
 * Mongoose schema for customer taxi bookings
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // Customer details
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },

    // Trip details
    pickup: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },

    drop: {
      type: String,
      required: [true, 'Drop location is required'],
      trim: true,
    },

    journeyDate: {
      type: Date,
      required: [true, 'Journey date is required'],
    },

    pickupTime: {
      type: String,
      required: [true, 'Pickup time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'],
    },

    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: {
        values: [
          'Sedan (Toyota Etios / Dzire)',
          'SUV (Mahindra XUV / Ertiga)',
          'Innova',
        ],
        message: 'Invalid vehicle type',
      },
    },

    // Booking lifecycle
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },

    // Admin notes (optional internal field)
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for faster admin queries
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ mobile: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
