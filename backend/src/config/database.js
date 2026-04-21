const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'farm_sms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle unexpected errors on idle clients — DON'T kill the server
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Pool auto-recovers dead clients. No process.exit()!
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};