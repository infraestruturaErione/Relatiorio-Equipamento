const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `
      SELECT
        c.id,
        c.name,
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
  const { name, project_name: projectName } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Client name is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        INSERT INTO clients (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING *
      `,
      [String(name).trim()]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Client already exists.' });
    }

    const createdClient = result.rows[0];
    let createdProject = null;

    if (projectName && String(projectName).trim()) {
      const projectResult = await client.query(
        `
          INSERT INTO projects (client_id, name)
          VALUES ($1, $2)
          RETURNING *
        `,
        [createdClient.id, String(projectName).trim()]
      );
      createdProject = projectResult.rows[0];
    }

    await client.query('COMMIT');
    return res.status(201).json({ ...createdClient, created_project: createdProject });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(400).json({ message: 'Invalid client id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Client not found.' });
    }

    await client.query('DELETE FROM equipment_configs WHERE client_id = $1', [clientId]);
    await client.query('DELETE FROM projects WHERE client_id = $1', [clientId]);
    await client.query('DELETE FROM clients WHERE id = $1', [clientId]);
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
