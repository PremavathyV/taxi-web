require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function test() {
  console.log('SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: process.env.MAIL_FROM,
    to:   process.env.ADMIN_NOTIFY_EMAIL,
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const info = await transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      process.env.ADMIN_NOTIFY_EMAIL,
      subject: '🧪 Sundara Travels – Test Email',
      html:    '<h2>Test email working!</h2><p>Brevo SMTP is configured correctly.</p>',
    });

    console.log('✅ Email sent! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    console.error('Full error:', err);
  }
}

test();
