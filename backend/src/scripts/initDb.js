require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function run() {
  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
  const seedPath = path.resolve(__dirname, '../../sql/seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const toStatements = (sql) =>
    sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);

  try {
    for (const statement of toStatements(schemaSql)) {
      await pool.query(statement);
    }

    for (const statement of toStatements(seedSql)) {
      await pool.query(statement);
    }
    // eslint-disable-next-line no-console
    console.log('Database initialized successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize database:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
