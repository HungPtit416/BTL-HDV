require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'user_service_db',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  maxUses: 7200,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

pool.on('connect', () => {
  console.log('Database connection pool created');
});

module.exports = pool;
