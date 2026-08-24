const { Pool } = require('pg');
require('dotenv').config();

// Single shared connection pool used by every route file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }, // needed for most hosted Postgres (Render/Railway/Neon)
});

module.exports = pool;
