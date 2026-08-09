/**
 * server.js – Sundara Travels Express API
 */

const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

'use strict';
require('dotenv').config();

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit     = require('express-rate-limit');
const path          = require('path');

const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');
const adminRoutes   = require('./routes/adminRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes  = require('./routes/driverRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');

connectDB();
const app = express();

/* ── Security ── */
app.set('trust proxy', 1); // Required for Render/Heroku reverse proxy
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'https://taxi-web-q2sj.vercel.app',
    'https://taxi-web-mrk9.onrender.com',
    'http://localhost:5000',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests.' } }));
app.use('/api/bookings', rateLimit({ windowMs: 15*60*1000, max: 50, message: { success: false, message: 'Too many booking attempts.' } }));
app.use('/api/contacts', rateLimit({ windowMs: 15*60*1000, max: 30, message: { success: false, message: 'Too many contact submissions.' } }));

/* ── Body parsing ── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

/* ── Static files ── */
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

/* ── API routes ── */
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const states = { 0:'disconnected', 1:'connected', 2:'connecting', 3:'disconnecting' };
  res.json({
    success: true, message: 'Sundara Travels API ✅',
    env: process.env.NODE_ENV,
    db: states[mongoose.connection.readyState] || 'unknown',
    dbState: mongoose.connection.readyState,
    smtp: { host: process.env.SMTP_HOST, user: process.env.SMTP_USER, from: process.env.MAIL_FROM, adminNotify: process.env.ADMIN_NOTIFY_EMAIL },
  });
});

app.get('/api/config/public', (req, res) => {
  res.json({
    success: true,
    data: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    },
  });
});

/* ── Test email route (temporary) ── */
app.get('/api/test-email', async (req, res) => {
  try {
    const { sendAdminNotification } = require('./utils/mailer');
    await sendAdminNotification({
      name: 'Test User', mobile: '7639103970', email: 'test@test.com',
      pickup: 'Chennai', drop: 'Bangalore', journeyDate: new Date(),
      pickupTime: '09:00', vehicleType: 'Sedan', status: 'Pending', specialInstructions: '',
    });
    res.json({ success: true, message: 'Test email sent to admin!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/api/admin',    adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers',  driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contacts', contactRoutes);

/* ── 404 ── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

/* ── Error handler ── */
app.use(errorHandler);

/* ── Start ── */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`));
process.on('unhandledRejection', (err) => { console.error('💥', err.message); server.close(() => process.exit(1)); });
module.exports = app;

