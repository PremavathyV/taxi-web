/**
 * server.js
 * Sundara Travels – Express API entry point
 */

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit    = require('express-rate-limit');

const connectDB      = require('./config/db');
const bookingRoutes  = require('./routes/bookingRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const errorHandler   = require('./middleware/errorHandler');

// ── Connect to MongoDB ───────────────────────────────────────
connectDB();

const app = express();

/* ═══════════════════════════════════════════════════════════
   SECURITY MIDDLEWARE
   ═══════════════════════════════════════════════════════════ */

// Set security HTTP headers
app.use(helmet());

// Enable CORS for frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting – 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// Stricter limit for booking creation – 10 per 15 min per IP
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many booking attempts. Please try again later.',
  },
});
app.use('/api/bookings', bookingLimiter);

/* ═══════════════════════════════════════════════════════════
   BODY PARSING & SANITISATION
   ═══════════════════════════════════════════════════════════ */

app.use(express.json({ limit: '10kb' }));          // JSON body parser
app.use(express.urlencoded({ extended: true }));    // URL-encoded body
app.use(mongoSanitize());                           // Prevent NoSQL injection

/* ═══════════════════════════════════════════════════════════
   ROUTES
   ═══════════════════════════════════════════════════════════ */

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sundara Travels API is running ✅',
    env:     process.env.NODE_ENV,
  });
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/admin',    adminRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ═══════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER (must be last)
   ═══════════════════════════════════════════════════════════ */
app.use(errorHandler);

/* ═══════════════════════════════════════════════════════════
   START SERVER
   ═══════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
