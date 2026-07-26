/**
 * controllers/paymentController.js
 * Payment CRUD – admin only
 */

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

/* ── GET all payments ── */
const getAllPayments = async (req, res, next) => {
  try {
    const { status, method, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.paymentStatus = status;
    if (method) filter.paymentMethod = method;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(filter);
    const data  = await Payment.find(filter)
      .populate('bookingId', 'name mobile pickup drop journeyDate status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), data });
  } catch (err) { next(err); }
};

/* ── GET single payment ── */
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId', 'name mobile pickup drop journeyDate status');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

/* ── CREATE payment for a booking ── */
const createPayment = async (req, res, next) => {
  try {
    const { bookingId, amount, paymentMethod, transactionId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const existing = await Payment.findOne({ bookingId });
    if (existing) return res.status(409).json({ success: false, message: 'Payment already exists for this booking.' });

    const payment = await Payment.create({
      bookingId, amount, paymentMethod,
      transactionId: transactionId || '',
      paymentStatus: 'paid',
      paymentDate: new Date(),
    });

    // Mark booking as completed if payment done
    await Booking.findByIdAndUpdate(bookingId, { status: 'Completed' });

    res.status(201).json({ success: true, message: 'Payment recorded.', data: payment });
  } catch (err) { next(err); }
};

/* ── UPDATE payment ── */
const updatePayment = async (req, res, next) => {
  try {
    const allowed = ['paymentStatus', 'paymentMethod', 'transactionId', 'amount', 'notes'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.paymentStatus === 'paid') updates.paymentDate = new Date();

    const payment = await Payment.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, message: 'Payment updated.', data: payment });
  } catch (err) { next(err); }
};

/* ── Revenue summary ── */
const getRevenueSummary = async (req, res, next) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, daily, weekly, monthly] = await Promise.all([
      Payment.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'paid', paymentDate: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'paid', paymentDate: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'paid', paymentDate: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue:   total[0]?.total   || 0,
        todayRevenue:   daily[0]?.total   || 0,
        weekRevenue:    weekly[0]?.total  || 0,
        monthRevenue:   monthly[0]?.total || 0,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getAllPayments, getPaymentById, createPayment, updatePayment, getRevenueSummary };
