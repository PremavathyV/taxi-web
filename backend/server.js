/**
 * server.js
 * Sundara Travels – Express API  (MongoDB + Mongoose)
 */

'use strict';
require('dotenv').config();

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const mongoSanitize  = require('express-mongo-sanitize');
const rateLimit      = require('express-rate-limit');
const path           = require('path');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');

/* ── Routes ── */
const adminRoutes    = require('./routes/adminRoutes');
const bookingRoutes  = require('./routes/bookingRoutes');
const driverRoutes   = require('./routes/driverRoutes');
const paymentRoutes  = require('./routes/paymentRoutes');
const contactRoutes  = require('./routes/contactRoutes');

// ── Connect MongoDB ──────────────────────────────────────────
connectDB();

const app = express();

/* ═══════════════════════════════════════════════════════════
   SECURITY
   ═══════════════════════════════════════════════════════════ */
app.use(helmet({ contentSecurityPolicy: false })); // CSP off so admin HTML loads CDN assets
app.use(cors({
  origin:       [process.env.CLIENT_URL || '*'],
  methods:      ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials:  true,
}));

// Global rate limit
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

// Stricter limit for public booking + contact
app.use('/api/bookings', rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  message: { success: false, message: 'Too many booking attempts.' },
}));
app.use('/api/contacts', rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many contact submissions.' },
}));

/* ═══════════════════════════════════════════════════════════
   BODY PARSING
   ═══════════════════════════════════════════════════════════ */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

/* ═══════════════════════════════════════════════════════════
   SERVE ADMIN DASHBOARD (static HTML)
   ═══════════════════════════════════════════════════════════ */
app.use('/admin', express.static(path.join(__dirname, 'admin')));
// Catch-all for admin SPA navigation
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════
   API ROUTES
   ═══════════════════════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sundara Travels API ✅', env: process.env.NODE_ENV });
});

app.use('/api/admin',    adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers',  driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contacts', contactRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

/* ═══════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER
   ═══════════════════════════════════════════════════════════ */
app.use(errorHandler);

/* ═══════════════════════════════════════════════════════════
   START
   ═══════════════════════════════════════════════════════════ */
const PORT   = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`)
);

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
