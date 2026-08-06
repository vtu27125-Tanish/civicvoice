const nodemailer = require('nodemailer');
require('dotenv').config();

async function main() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log('EMAIL_USER / EMAIL_PASS are not set (or commented out) in .env.');
    return;
  }

  console.log(`Testing SMTP login for: ${user}`);
  console.log(`Password length: ${pass.replace(/\s/g, '').length} characters (should be 16)`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await transporter.verify();
    console.log('SMTP LOGIN SUCCESSFUL - credentials are valid.');

    await transporter.sendMail({
      from: `"CivicVoice Test" <${user}>`,
      to: user,
      subject: 'CivicVoice SMTP test',
      text: 'If you got this, your Gmail app password is working correctly.'
    });
    console.log(`Test email sent to ${user} - check your inbox.`);
  } catch (err) {
    console.log('SMTP LOGIN FAILED');
    console.log('Error code:', err.code);
    console.log('Response:', err.response || err.message);
  }
}

main();