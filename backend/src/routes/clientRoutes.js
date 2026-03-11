const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `
      SELECT
        c.id,
        c.name,
        c.ip,
        c.mask,
        c.gateway,
        c.created_at,
        COUNT(DISTINCT p.id)::int AS projects_count,
        COUNT(ec.id)::int AS configs_count
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `
  );
  return res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Client name is required.' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO clients (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING *
      `,
      [String(name).trim()]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ message: 'Client already exists.' });
    }

    await logAudit(pool, {
      entityType: 'client',
      entityId: result.rows[0].id,
      action: 'CREATE',
      changedBy: req.user.id,
      afterData: result.rows[0],
    });

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    throw error;
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const clientId = Number(req.params.id);
  const { name } = req.body;

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(400).json({ message: 'Invalid client id.' });
  }

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Client name is required.' });
  }

  const existingResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (existingResult.rowCount === 0) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  const duplicateResult = await pool.query(
    'SELECT id FROM clients WHERE name = $1 AND id <> $2',
    [String(name).trim(), clientId]
  );

  if (duplicateResult.rowCount > 0) {
    return res.status(409).json({ message: 'Client already exists.' });
  }

  const beforeData = existingResult.rows[0];
  const result = await pool.query(
    `
      UPDATE clients
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [String(name).trim(), clientId]
  );

  await logAudit(pool, {
    entityType: 'client',
    entityId: clientId,
    action: 'UPDATE',
    changedBy: req.user.id,
    beforeData,
    afterData: result.rows[0],
  });

  return res.json(result.rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(400).json({ message: 'Invalid client id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Client not found.' });
    }

    await client.query('DELETE FROM equipment_configs WHERE client_id = $1', [clientId]);
    await client.query('DELETE FROM projects WHERE client_id = $1', [clientId]);
    await client.query('DELETE FROM clients WHERE id = $1', [clientId]);
    await logAudit(client, {
      entityType: 'client',
      entityId: clientId,
      action: 'DELETE',
      changedBy: req.user.id,
      beforeData: exists.rows[0],
    });
    await client.query('COMMIT');

    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = router;
