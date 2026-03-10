const { Pool } = require('pg');

function createPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  const hasHostConfig =
    process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER;

  if (!hasHostConfig) {
    throw new Error(
      'Missing DB config. Use DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD in .env'
    );
  }

  if (typeof process.env.DB_PASSWORD !== 'string') {
    throw new Error('DB_PASSWORD is required in .env and must be a string.');
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

const pool = new Pool(createPoolConfig());

module.exports = pool;
