/**
 * utils/mailer.js
 * Uses Brevo (Sendinblue) REST API — works on all hosting platforms
 * No SMTP port issues.
 */

const https = require('https');

/**
 * Send email via Brevo REST API
 */
function sendBrevoEmail({ to, toName, subject, html }) {
  return new Promise((resolve, reject) => {
    const apiKey = (process.env.BREVO_API_KEY || process.env.SMTP_PASS || '').trim().replace(/[^\x20-\x7E]/g, '');
    if (!apiKey || apiKey.includes('your_')) {
      console.log('📧 Email skipped — BREVO_API_KEY not configured');
      return resolve({ skipped: true });
    }

    const payload = JSON.stringify({
      sender:  { name: 'Sundara Travels', email: process.env.SMTP_USER || 'b395ca001@smtp-brevo.com' },
      to:      [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers:  {
        'api-key':       Buffer.from(apiKey).toString('ascii').replace(/[^\x20-\x7E]/g, ''),
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Brevo API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Customer booking confirmation email
 */
const sendCustomerConfirmation = async (booking) => {
  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0F172A,#1e3a5f);padding:28px 32px;text-align:center">
      <h1 style="color:#F59E0B;margin:0;font-size:1.5rem">🚕 Sundara Travels</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.9rem">Booking Confirmation</p>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#111827;font-size:1rem">Hi <strong>${booking.name}</strong>,</p>
      <p style="color:#4B5563;font-size:0.9rem;line-height:1.6">
        Thank you for choosing Sundara Travels! Your booking has been received and is
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
        For support call: <a href="tel:+917639103970" style="color:#2563EB">+91 76391 03970</a>
      </p>
    </div>
    <div style="background:#F8FAFC;padding:14px 32px;text-align:center">
      <p style="color:#9CA3AF;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sundara Travels. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await sendBrevoEmail({
    to:      booking.email,
    toName:  booking.name,
    subject: '✅ Booking Confirmed – Sundara Travels',
    html,
  });
};

/**
 * Admin new booking notification
 */
const sendAdminNotification = async (booking) => {
  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <h2 style="color:#111827;margin:0 0 16px">🔔 New Booking – Sundara Travels</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem;width:40%">Customer</td><td style="font-weight:600;color:#111827">${booking.name}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Mobile</td><td style="font-weight:600;color:#111827">+91 ${booking.mobile}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Email</td><td style="color:#111827">${booking.email || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Pickup</td><td style="color:#111827">${booking.pickup}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Drop</td><td style="color:#111827">${booking.drop}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Date & Time</td><td style="color:#111827">${dateStr} at ${booking.pickupTime}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Vehicle</td><td style="color:#111827">${booking.vehicleType}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Status</td><td><span style="background:#FEF3C7;color:#92400E;padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600">${booking.status}</span></td></tr>
      ${booking.specialInstructions ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:0.82rem">Message</td><td style="color:#111827">${booking.specialInstructions}</td></tr>` : ''}
    </table>
  </div>
</body>
</html>`;

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'vprema376@gmail.com';
  await sendBrevoEmail({
    to:      adminEmail,
    toName:  'Admin',
    subject: `🚕 New Booking: ${booking.name} – ${booking.pickup} → ${booking.drop}`,
    html,
  });
};

module.exports = { sendCustomerConfirmation, sendAdminNotification };
