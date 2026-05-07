const { Pool } = require('pg');

let pool = null;

const getPool = () => {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  const requiresSsl =
    process.env.DB_SSL === 'true' ||
    /sslmode=require/i.test(connectionString) ||
    /neon\.tech/i.test(connectionString);

  pool = new Pool({
    connectionString,
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  });

  return pool;
};

const isDatabaseEnabled = () => {
  return Boolean(process.env.DATABASE_URL);
};

const query = async (text, params = []) => {
  const db = getPool();
  if (!db) {
    throw new Error('DATABASE_URL is not configured');
  }
  return db.query(text, params);
};

module.exports = {
  getPool,
  isDatabaseEnabled,
  query,
};
