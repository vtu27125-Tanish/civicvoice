const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { sendOtpEmail } = require('../utils/mailer');
require('dotenv').config();

const router = express.Router();

const OTP_EXPIRY_MINUTES = 10;

// OTP Rate Limiter
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
        return req.body.email || req.ip;
    },

    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            error: "Too many verification codes requested. Please wait one minute."
        });
    }
});

function generateOtp() {
  // 6-digit numeric code, cryptographically random rather than Math.random()
  return crypto.randomInt(100000, 1000000).toString();
}

async function createAndSendOtp(email, purpose) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    'INSERT INTO otp_codes (contact, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [email, code, purpose, expiresAt]
  );
  await sendOtpEmail(email, code, purpose);
}

// POST /api/auth/register -> creates an unverified account, sends a signup OTP by email
// (phone number is collected and stored, but is not used for OTP delivery)
router.post(
  '/register',
  otpLimiter,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password, role = 'citizen', language_pref = 'en', department_id = null } = req.body;

    try {
      const [existing] = await pool.query(
        'SELECT id, is_verified FROM users WHERE email = ? OR phone = ?',
        [email, phone]
      );
      if (existing.length > 0 && existing[0].is_verified) {
        return res.status(409).json({ error: 'Email or phone number already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      if (existing.length > 0 && !existing[0].is_verified) {
        // Account exists but was never verified — update it and resend a fresh code
        // rather than blocking with a duplicate-email error.
        await pool.query(
          'UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ?, role = ?, language_pref = ?, department_id = ? WHERE id = ?',
          [name, email, phone, password_hash, role, language_pref, department_id, existing[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO users (name, email, phone, password_hash, role, language_pref, department_id, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)',
          [name, email, phone, password_hash, role, language_pref, department_id]
        );
      }

      await createAndSendOtp(email, 'signup');

      res.status(201).json({
        message: 'Verification code sent to your email. Enter it to complete registration.',
        email,
        purpose: 'signup'
      });
    } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
}
  }
);

// POST /api/auth/login -> verifies password and issues JWT token directly (no OTP for login)
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.is_verified) {
        return res.status(403).json({
          error: 'Account not verified. Please complete email verification during sign up.',
          requiresVerification: true,
          email: user.email,
          purpose: 'signup'
        });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, department_id: user.department_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, department_id: user.department_id }
      });
   } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
}
});

// POST /api/auth/verify-otp -> checks the code, issues the real JWT on success
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
    body('purpose').isIn(['signup', 'login']).withMessage('Invalid purpose')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, code, purpose } = req.body;

    try {
      const [otpRows] = await pool.query(
        `SELECT * FROM otp_codes 
         WHERE contact = ? AND code = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email, code, purpose]
      );

      if (otpRows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
      }

      await pool.query('UPDATE otp_codes SET is_used = TRUE WHERE id = ?', [otpRows[0].id]);

      if (purpose === 'signup') {
        await pool.query('UPDATE users SET is_verified = TRUE WHERE email = ?', [email]);
      }

      const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = userRows[0];
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, department_id: user.department_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, department_id: user.department_id }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error while verifying code' });
    }
  }
);

// POST /api/auth/resend-otp -> sends a fresh code for the given email + purpose
router.post('/resend-otp', otpLimiter, async (req, res) => {
  const { email, purpose } = req.body;
  if (!email || !purpose) return res.status(400).json({ error: 'Email and purpose are required' });

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'No account found for this email' });

    await createAndSendOtp(email, purpose);
    res.json({ message: 'A new verification code has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while resending code' });
  }
});

module.exports = router;