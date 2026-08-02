/**
 * utils/whatsapp.js
 * Sends WhatsApp notification to owner via CallMeBot API (free, no approval needed)
 * Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * One-time setup for owner:
 *   Save +34 644 82 22 57 in contacts as "CallMeBot"
 *   Send: "I allow callmebot to send me messages"  to that number on WhatsApp
 *   You will receive your personal CALLMEBOT_API_KEY in reply
 */

const https = require('https');

/**
 * Send WhatsApp message via CallMeBot free API
 */
function sendCallMeBotWhatsApp(phone, message) {
  return new Promise((resolve, reject) => {
    const apiKey = (process.env.CALLMEBOT_API_KEY || '').trim();
    const phoneNum = phone.replace(/[^0-9]/g, ''); // strip non-digits

    if (!apiKey) {
      console.warn('📱 WA skipped — CALLMEBOT_API_KEY not set in .env');
      return resolve({ skipped: true, reason: 'no_api_key' });
    }
    if (!phoneNum) {
      console.warn('📱 WA skipped — OWNER_WHATSAPP_NUMBER not set in .env');
      return resolve({ skipped: true, reason: 'no_phone' });
    }

    const encoded = encodeURIComponent(message);
    const path = `/whatsapp.php?phone=${phoneNum}&text=${encoded}&apikey=${apiKey}`;

    console.log(`📱 Sending WA to +${phoneNum} via CallMeBot…`);

    const options = {
      hostname: 'api.callmebot.com',
      path,
      method: 'GET',
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📱 CallMeBot response [${res.statusCode}]: ${data.slice(0, 120)}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, response: data });
        } else {
          reject(new Error(`CallMeBot ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', err => {
      console.error('📱 CallMeBot request error:', err.message);
      reject(err);
    });
    req.end();
  });
}

/**
 * Send booking notification to owner's WhatsApp
 */
const sendOwnerWhatsApp = async (booking) => {
  const rawNumber = process.env.OWNER_WHATSAPP_NUMBER || '';
  // Accept formats: whatsapp:+919444539285  OR  +919444539285  OR  919444539285
  const ownerPhone = rawNumber.replace(/[^0-9]/g, '');

  if (!ownerPhone) {
    console.warn('📱 WA skipped — OWNER_WHATSAPP_NUMBER not set.');
    return;
  }

  const dateStr = new Date(booking.journeyDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const msg = [
    '🚖 NEW TAXI BOOKING – Sundara Travels',
    '',
    `Name:    ${booking.name}`,
    `Phone:   +91 ${booking.mobile}`,
    `Email:   ${booking.email || '—'}`,
    `Pickup:  ${booking.pickup}`,
    `Drop:    ${booking.drop}`,
    `Date:    ${dateStr}`,
    `Time:    ${booking.pickupTime}`,
    `Vehicle: ${booking.vehicleType}`,
    `Note:    ${booking.specialInstructions || '—'}`,
    `Status:  ${booking.status}`,
  ].join('\n');

  await sendCallMeBotWhatsApp(ownerPhone, msg);
};

module.exports = { sendOwnerWhatsApp };
