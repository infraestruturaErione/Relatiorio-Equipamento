const fs = require('fs');
const path = require('path');

function toStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function applySqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');

  for (const statement of toStatements(sql)) {
    await pool.query(statement);
  }
}

async function runMigrations(pool, { withSeed = false } = {}) {
  const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
  await applySqlFile(pool, schemaPath);

  if (withSeed) {
    const seedPath = path.resolve(__dirname, '../sql/seed.sql');
    await applySqlFile(pool, seedPath);
  }
}

module.exports = { runMigrations };
