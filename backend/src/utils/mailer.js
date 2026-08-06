require('dotenv').config();
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'CivicVoice';
async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${errBody}`);
  }
  return res.json();
}
const STATUS_MESSAGES = {
  reported: 'has been received and is awaiting verification.',
  verified: 'has been verified and is awaiting department assignment.',
  assigned: 'has been assigned to the relevant department.',
  in_progress: 'is now being worked on.',
  resolved: 'has been marked as resolved. Thank you for reporting it!',
  rejected: 'was reviewed and marked as not actionable.'
};
async function sendStatusUpdateEmail(toEmail, reportId, category, status) {
  if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
    console.log(`[email skipped - not configured] Report #${reportId} -> ${status}`);
    return;
  }
  const statusText = STATUS_MESSAGES[status] || `is now marked as ${status}.`;
  try {
    await sendViaBrevo({
      to: toEmail,
      subject: `CivicVoice - Report #${reportId} update`,
      text: `Your ${category} report (#${reportId}) ${statusText}\n\n- CivicVoice`,
      html: `<p>Your <strong>${category}</strong> report (#${reportId}) ${statusText}</p>`
    });
    console.log(`Email sent to ${toEmail} for report #${reportId}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}
async function sendOtpEmail(toEmail, code, purpose) {
  const purposeText = purpose === 'signup' ? 'complete your registration' : 'log in';
  if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
    console.log(`[email skipped - not configured] OTP for ${toEmail} (${purpose}): ${code}`);
    return;
  }
  try {
    await sendViaBrevo({
      to: toEmail,
      subject: `Your CivicVoice verification code: ${code}`,
      text: `Use this code to ${purposeText}: ${code}\n\nThis code expires in 10 minutes.\n\n- CivicVoice`,
      html: `<p>Use this code to ${purposeText}:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p style="font-size:13px;">This code expires in 10 minutes.</p>`
    });
    console.log(`OTP email sent to ${toEmail} (${purpose})`);
  } catch (err) {
    console.error('OTP email send failed:', err.message);
    throw err;
  }
}
module.exports = { sendStatusUpdateEmail, sendOtpEmail };
