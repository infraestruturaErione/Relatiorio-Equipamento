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

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function getMigrationFiles() {
  const migrationsDir = path.resolve(__dirname, '../sql/migrations');
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({
      file,
      fullPath: path.join(migrationsDir, file),
    }));
}

async function runMigrations(pool, { withSeed = false } = {}) {
  await ensureMigrationTable(pool);

  const appliedResult = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  for (const migration of getMigrationFiles()) {
    if (applied.has(migration.file)) continue;

    await pool.query('BEGIN');
    try {
      await applySqlFile(pool, migration.fullPath);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migration.file]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  if (withSeed) {
    const seedPath = path.resolve(__dirname, '../sql/seed.sql');
    await applySqlFile(pool, seedPath);
  }
}

module.exports = { runMigrations };
