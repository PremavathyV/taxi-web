/**
 * utils/mailer.js
 * Nodemailer transporter and email helpers
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send booking confirmation email to customer
 * @param {Object} booking - Mongoose booking document
 */
const sendCustomerConfirmation = async (booking) => {
  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#111827,#1e293b);padding:28px 32px;text-align:center">
          <h1 style="color:#FFC107;margin:0;font-size:1.5rem">🚕 Sundara Travels</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.9rem">Booking Confirmation</p>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#111827;font-size:1rem">Hi <strong>${booking.name}</strong>,</p>
          <p style="color:#4B5563;font-size:0.9rem;line-height:1.6">
            Thank you for choosing Sundara Travels! Your booking has been received and is currently
            <strong style="color:#F59E0B">Pending Confirmation</strong>. We will contact you shortly.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#F8FAFC">
              <td style="padding:10px 14px;font-size:0.82rem;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB">📍 Pickup</td>
              <td style="padding:10px 14px;font-size:0.88rem;color:#111827;border-bottom:1px solid #E5E7EB">${booking.pickup}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:0.82rem;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB">🏁 Drop</td>
              <td style="padding:10px 14px;font-size:0.88rem;color:#111827;border-bottom:1px solid #E5E7EB">${booking.drop}</td>
            </tr>
            <tr style="background:#F8FAFC">
              <td style="padding:10px 14px;font-size:0.82rem;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB">📅 Date</td>
              <td style="padding:10px 14px;font-size:0.88rem;color:#111827;border-bottom:1px solid #E5E7EB">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:0.82rem;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB">🕐 Time</td>
              <td style="padding:10px 14px;font-size:0.88rem;color:#111827;border-bottom:1px solid #E5E7EB">${booking.pickupTime}</td>
            </tr>
            <tr style="background:#F8FAFC">
              <td style="padding:10px 14px;font-size:0.82rem;color:#6B7280;font-weight:600">🚗 Vehicle</td>
              <td style="padding:10px 14px;font-size:0.88rem;color:#111827">${booking.vehicleType}</td>
            </tr>
          </table>
          <p style="color:#4B5563;font-size:0.85rem;line-height:1.6">
            For support call: <a href="tel:+919444539285" style="color:#2563EB">+91 94445 39285</a>
          </p>
        </div>
        <div style="background:#F8FAFC;padding:14px 32px;text-align:center">
          <p style="color:#9CA3AF;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sundara Travels. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      `${booking.mobile}@sms.invalid`, // placeholder; swap with email field if added
    subject: '✅ Booking Received – Sundara Travels',
    html,
  });
};

/**
 * Send new booking notification to admin
 * @param {Object} booking - Mongoose booking document
 */
const sendAdminNotification = async (booking) => {
  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <h2 style="color:#111827;margin:0 0 16px">🔔 New Booking – Sundara Travels</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem;width:40%">Customer</td><td style="font-weight:600;color:#111827">${booking.name}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Mobile</td><td style="font-weight:600;color:#111827">+91 ${booking.mobile}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Pickup</td><td style="color:#111827">${booking.pickup}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Drop</td><td style="color:#111827">${booking.drop}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Date</td><td style="color:#111827">${dateStr} at ${booking.pickupTime}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Vehicle</td><td style="color:#111827">${booking.vehicleType}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Status</td><td><span style="background:#FEF3C7;color:#92400E;padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600">${booking.status}</span></td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Booking ID</td><td style="font-family:monospace;font-size:0.8rem;color:#6B7280">${booking._id}</td></tr>
        </table>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      process.env.ADMIN_NOTIFY_EMAIL,
    subject: `🚕 New Booking: ${booking.name} – ${booking.pickup} → ${booking.drop}`,
    html,
  });
};

module.exports = { sendCustomerConfirmation, sendAdminNotification };
