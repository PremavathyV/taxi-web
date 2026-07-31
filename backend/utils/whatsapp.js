/**
 * utils/whatsapp.js
 * Twilio WhatsApp API – sends automatic booking notification to owner
 * No customer action required.
 */

const https = require('https');

/**
 * Send WhatsApp message via Twilio API
 */
function sendTwilioWhatsApp(to, body) {
  return new Promise((resolve, reject) => {
    const sid   = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
    const from  = (process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886').trim();

    if (!sid || !token || sid.includes('YOUR_') || !sid.startsWith('AC')) {
      console.log('📱 WhatsApp skipped — TWILIO_ACCOUNT_SID not configured.');
      return resolve({ skipped: true });
    }

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const params = new URLSearchParams({ From: from, To: toNumber, Body: body });
    const auth   = Buffer.from(`${sid}:${token}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      path:     `/2010-04-01/Accounts/${sid}/Messages.json`,
      method:   'POST',
      headers:  {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params.toString()),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data || '{}');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`📱 WhatsApp sent to ${to} — SID: ${parsed.sid}`);
          resolve(parsed);
        } else {
          reject(new Error(`Twilio ${res.statusCode}: ${parsed.message || data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

/**
 * Send booking notification to owner's WhatsApp
 */
const sendOwnerWhatsApp = async (booking) => {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (!ownerNumber) {
    console.log('📱 WhatsApp skipped — OWNER_WHATSAPP_NUMBER not set.');
    return;
  }

  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const msg = [
    '🚖 *NEW TAXI BOOKING*',
    '',
    `*Booking ID:*     ${booking._id}`,
    `*Customer Name:*  ${booking.name}`,
    `*Phone Number:*   +91 ${booking.mobile}`,
    `*Email Address:*  ${booking.email || '—'}`,
    `*Pickup Location:* ${booking.pickup}`,
    `*Destination:*    ${booking.drop}`,
    `*Journey Date:*   ${dateStr}`,
    `*Pickup Time:*    ${booking.pickupTime}`,
    `*Vehicle Type:*   ${booking.vehicleType}`,
    `*Add. Message:*   ${booking.specialInstructions || '—'}`,
    `*Booking Status:* ${booking.status}`,
    `*Created Time:*   ${new Date(booking.createdAt).toLocaleString('en-IN')}`,
  ].join('\n');

  await sendTwilioWhatsApp(ownerNumber, msg);
};

module.exports = { sendOwnerWhatsApp };
