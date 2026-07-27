/**
 * models/Driver.js
 * Mongoose schema for taxi drivers
 */

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Driver name is required'],
      trim: true, minlength: 2, maxlength: 100,
    },
    phone: {
      type: String, required: [true, 'Phone number is required'],
      unique: true, trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    vehicleNumber: {
      type: String, required: [true, 'Vehicle number is required'],
      unique: true, trim: true, uppercase: true,
    },
    vehicleType: {
      type: String, required: [true, 'Vehicle type is required'],
      enum: ['Sedan (Toyota Etios / Dzire)', 'SUV (Mahindra XUV / Ertiga)', 'Innova'],
    },
    licenseNumber: { type: String, trim: true, default: '' },
    email:         { type: String, trim: true, lowercase: true, default: '' },
    address:       { type: String, trim: true, default: '' },
    isAvailable:   { type: Boolean, default: true },
    isActive:      { type: Boolean, default: true },
    totalTrips:    { type: Number, default: 0 },
    rating:        { type: Number, default: 0, min: 0, max: 5 },
    address:       { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

driverSchema.index({ isAvailable: 1, isActive: 1 });

module.exports = mongoose.model('Driver', driverSchema);
