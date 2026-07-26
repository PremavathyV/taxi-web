/**
 * controllers/contactController.js
 * Public: submit contact form
 * Protected: admin reads, deletes, resolves
 */

const Contact = require('../models/Contact');

/* ── PUBLIC: Submit contact form ── */
const submitContact = async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body;
    const contact = await Contact.create({ name, phone, email, subject, message });
    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you shortly.',
      data: { id: contact._id },
    });
  } catch (err) { next(err); }
};

/* ── ADMIN: Get all contacts ── */
const getAllContacts = async (req, res, next) => {
  try {
    const { resolved, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (resolved !== undefined) filter.isResolved = resolved === 'true';

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contact.countDocuments(filter);
    const data  = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), data });
  } catch (err) { next(err); }
};

/* ── ADMIN: Get single contact ── */
const getContactById = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, data: contact });
  } catch (err) { next(err); }
};

/* ── ADMIN: Mark resolved / add note ── */
const updateContact = async (req, res, next) => {
  try {
    const { isResolved, adminNote } = req.body;
    const updates = {};
    if (isResolved !== undefined) updates.isResolved = isResolved;
    if (adminNote  !== undefined) updates.adminNote  = adminNote;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: 'Contact updated.', data: contact });
  } catch (err) { next(err); }
};

/* ── ADMIN: Delete contact ── */
const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: 'Contact deleted.' });
  } catch (err) { next(err); }
};

module.exports = { submitContact, getAllContacts, getContactById, updateContact, deleteContact };
