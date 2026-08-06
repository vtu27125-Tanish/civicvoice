const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');
require('dotenv').config();

async function resetUsers() {
  const users = [
    { email: 'test@example.com',     password: 'Test@1234' },
    { email: 'official@example.com', password: 'Official@1234' },
    { email: 'water2@example.com',   password: 'Official@1234' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, is_verified = 1 WHERE email = ?',
      [hash, u.email]
    );
    console.log(`✅ Reset password for ${u.email}`);
  }

  // Verify
  const [rows] = await pool.query('SELECT email, LEFT(password_hash,10) as preview, is_verified FROM users');
  console.log('\nVerification:');
  rows.forEach(r => console.log(`  ${r.email} | hash: ${r.preview}... | verified: ${r.is_verified}`));

  process.exit(0);
}

resetUsers().catch(err => { console.error(err); process.exit(1); });
