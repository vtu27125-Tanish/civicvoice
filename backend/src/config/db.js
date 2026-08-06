const mysql = require('mysql2/promise');
const dns = require('dns');
require('dotenv').config();

// Force IPv4 first — fixes ETIMEDOUT connecting from some cloud hosts (e.g. Render)
// to providers like Aiven that publish both IPv4 and IPv6 addresses.
dns.setDefaultResultOrder('ipv4first');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'civicvoice',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;