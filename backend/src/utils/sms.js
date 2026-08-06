require('dotenv').config();

// SMS OTP via Fast2SMS (https://www.fast2sms.com) — India-only numbers on
// the free "OTP route". No number purchase or DLT registration needed to
// get started with free trial credits.
//
// Setup:
// 1. Sign up free at https://www.fast2sms.com
// 2. Dashboard -> Dev API -> copy your API key
// 3. Set FAST2SMS_API_KEY below (as an env var)
//
// Without FAST2SMS_API_KEY set, this falls back to logging the OTP to the
// console so development can continue without an SMS account.

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const OTP_VALIDITY_MINUTES = 10;

function normalizeIndianNumber(phone) {
  // Accepts "9876543210", "+919876543210", "919876543210", with spaces/dashes.
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits.slice(-10); // best-effort fallback
}

async function sendOtpSms(phone, code, purpose) {
  const number = normalizeIndianNumber(phone);

  if (!FAST2SMS_API_KEY) {
    console.log(`[sms skipped — not configured] OTP for ${phone} (${purpose}): ${code}`);
    return;
  }

  // Using Fast2SMS's "Quick SMS" route (route=q), not the OTP route.
  // The OTP route requires DLT registration (a mandatory TRAI/govt
  // telecom rule for India, not a Fast2SMS restriction) before it will
  // send to any number. Quick SMS works without DLT registration, but
  // until your Fast2SMS account is verified it can only deliver to the
  // mobile number registered on that account — same testing limitation
  // Resend had for email.
  const url = new URL('https://www.fast2sms.com/dev/bulkV2');
  url.searchParams.set('authorization', FAST2SMS_API_KEY);
  url.searchParams.set('route', 'q');
  url.searchParams.set('message', `Your CivicVoice verification code is ${code}. Valid for ${OTP_VALIDITY_MINUTES} minutes.`);
  url.searchParams.set('language', 'english');
  url.searchParams.set('flash', '0');
  url.searchParams.set('numbers', number);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.return !== true) {
    throw new Error(`Fast2SMS error: ${JSON.stringify(data)}`);
  }

  console.log(`OTP SMS sent to ${phone} (${purpose})`);
}

module.exports = { sendOtpSms };