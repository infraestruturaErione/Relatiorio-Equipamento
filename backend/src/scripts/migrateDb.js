require('dotenv').config();
const pool = require('../db');
const { runMigrations } = require('../dbMigrate');

async function run() {
  try {
    await runMigrations(pool);
    // eslint-disable-next-line no-console
    console.log('Database migrated successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to migrate database:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
