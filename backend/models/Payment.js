/**
 * models/Payment.js
 * Mongoose schema for booking payments
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking', required: true, unique: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'net_banking', 'other'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: { type: String, trim: true, default: '' },
    paymentDate:   { type: Date, default: null },
    notes:         { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentStatus: 1 });
// bookingId index comes from unique:true in field definition — no duplicate needed

module.exports = mongoose.model('Payment', paymentSchema);
