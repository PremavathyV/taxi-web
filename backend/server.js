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
  origin: [
    'https://taxi-web-q2sj.vercel.app',
    'https://taxi-web-mrk9.onrender.com',
    'http://localhost:5000',
    'http://localhost:3000',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  methods:        ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials:    true,
}));

// Global rate limit
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

// Stricter limit for public booking + contact
app.use('/api/bookings', rateLimit({
  windowMs: 15 * 60 * 1000, max: 50,
  message: { success: false, message: 'Too many booking attempts. Please try again later.' },
}));
app.use('/api/contacts', rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many contact submissions.' },
}));

/* ═══════════════════════════════════════════════════════════
   BODY PARSING
   ═══════════════════════════════════════════════════════════ */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

/* ═══════════════════════════════════════════════════════════
   SERVE ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════
   SERVE FRONTEND (customer website)
   ═══════════════════════════════════════════════════════════ */
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════
   API ROUTES
   ═══════════════════════════════════════════════════════════ */
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState  = mongoose.connection.readyState;
  const states   = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    success: true,
    message: 'Sundara Travels API ✅',
    env:     process.env.NODE_ENV,
    db:      states[dbState] || 'unknown',
    dbState,
    smtp: {
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      from: process.env.MAIL_FROM,
      adminNotify: process.env.ADMIN_NOTIFY_EMAIL,
    },
  });
});

app.use('/api/admin',    adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers',  driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contacts', contactRoutes);

    await t.verify();
    const info = await t.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: '🧪 Sundara Travels Email Test',
      html: '<h2>Email is working!</h2><p>Sent from Render via Brevo.</p>',
    });
    res.json({ success: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Temporary email test route
app.get('/api/test-email', async (req, res) => {
  try {
    const { sendAdminNotification } = require('./utils/mailer');
    await sendAdminNotification({ name:'Test', mobile:'9444539285', email:'test@test.com', pickup:'Chennai', drop:'Bangalore', journeyDate:new Date(), pickupTime:'09:00', vehicleType:'Sedan', status:'Pending', specialInstructions:'' });
    res.json({ success: true, message: 'Test email sent!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 404app.use((req, res) => {
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

    await t.verify();
    const info = await t.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: '🧪 Sundara Travels Email Test',
      html: '<h2>Email is working!</h2><p>Sent from Render via Brevo.</p>',
    });
    res.json({ success: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

