/**
 * models/Contact.js
 * Mongoose schema for contact form submissions
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    phone:      { type: String, trim: true, default: '' },
    email:      { type: String, trim: true, lowercase: true, default: '' },
    subject:    { type: String, trim: true, default: 'General Inquiry' },
    message:    { type: String, required: true, trim: true },
    isResolved: { type: Boolean, default: false },
    adminNote:  { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

contactSchema.index({ isResolved: 1, createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
