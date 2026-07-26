/**
 * routes/paymentRoutes.js
 * GET  /api/payments/revenue  (protected)
 * GET  /api/payments          (protected)
 * POST /api/payments          (protected)
 * GET  /api/payments/:id      (protected)
 * PATCH /api/payments/:id     (protected)
 */

const express = require('express');
const router  = express.Router();

const {
  getAllPayments, getPaymentById, createPayment,
  updatePayment, getRevenueSummary,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/revenue', getRevenueSummary);
router.get('/',        getAllPayments);
router.post('/',       createPayment);
router.get('/:id',     getPaymentById);
router.patch('/:id',   updatePayment);

module.exports = router;
