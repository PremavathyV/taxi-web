/**
 * models/Booking.js
 * Mongoose schema for customer taxi bookings (full version)
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // Customer details
    name: {
      type: String, required: [true, 'Name is required'],
      trim: true, minlength: 3, maxlength: 50,
    },
    mobile: {
      type: String, required: [true, 'Mobile number is required'],
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },

    // Trip details
    pickup:    { type: String, required: [true, 'Pickup location is required'], trim: true },
    drop:      { type: String, required: [true, 'Drop location is required'],   trim: true },
    journeyDate: { type: Date, required: [true, 'Journey date is required'] },
    pickupTime:  {
      type: String, required: [true, 'Pickup time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'],
    },
    vehicleType: {
      type: String, required: [true, 'Vehicle type is required'],
      enum: ['Sedan', 'SUV', 'Innova'],
    },
    tripType: {
      type: String,
      enum: ['one_way', 'round_trip'],
      default: 'one_way',
    },
    specialInstructions: { type: String, trim: true, default: '' },

    // Assignment
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver', default: null,
    },

    // Booking lifecycle
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },

    adminNote:    { type: String, trim: true, default: '' },
    cancelReason: { type: String, trim: true, default: '' },

    // Fare estimate
    estimatedFare: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ mobile: 1 });
bookingSchema.index({ journeyDate: 1 });
bookingSchema.index({ driverId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

