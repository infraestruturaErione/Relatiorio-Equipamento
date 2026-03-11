const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const params = [];
  let whereClause = '';

  if (req.query.client_id) {
    const clientId = Number(req.query.client_id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ message: 'Invalid client_id filter.' });
    }
    params.push(clientId);
    whereClause = `WHERE p.client_id = $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.client_id,
        p.name,
        p.created_at,
        c.name AS client_name,
        COUNT(ec.id)::int AS total_configs,
        COUNT(*) FILTER (WHERE ec.status = 'PENDING')::int AS pending_configs,
        COUNT(*) FILTER (WHERE ec.status = 'APPROVED')::int AS approved_configs,
        COUNT(*) FILTER (WHERE ec.status = 'REJECTED')::int AS rejected_configs
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      ${whereClause}
      GROUP BY p.id, c.name
      ORDER BY c.name ASC, p.name ASC
    `,
    params
  );

  return res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ message: 'Invalid project id.' });
  }

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.client_id,
        p.name,
        p.created_at,
        c.name AS client_name,
        c.ip AS client_ip,
        c.mask AS client_mask,
        c.gateway AS client_gateway,
        client_stats.projects_count,
        client_stats.configs_count,
        COUNT(ec.id)::int AS total_configs,
        COUNT(*) FILTER (WHERE ec.status = 'PENDING')::int AS pending_configs,
        COUNT(*) FILTER (WHERE ec.status = 'APPROVED')::int AS approved_configs,
        COUNT(*) FILTER (WHERE ec.status = 'REJECTED')::int AS rejected_configs
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      INNER JOIN (
        SELECT
          c_inner.id AS client_id,
          COUNT(DISTINCT p_inner.id)::int AS projects_count,
          COUNT(ec_inner.id)::int AS configs_count
        FROM clients c_inner
        LEFT JOIN projects p_inner ON p_inner.client_id = c_inner.id
        LEFT JOIN equipment_configs ec_inner ON ec_inner.project_id = p_inner.id
        GROUP BY c_inner.id
      ) AS client_stats ON client_stats.client_id = c.id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.ip, c.mask, c.gateway, client_stats.projects_count, client_stats.configs_count
    `,
    [projectId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  return res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const { client_id: clientId, name } = req.body;

  if (!clientId || !name || !String(name).trim()) {
    return res.status(400).json({ message: 'Client and project name are required.' });
  }

  const clientResult = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
  if (clientResult.rowCount === 0) {
    return res.status(400).json({ message: 'Client not found.' });
  }

  const result = await pool.query(
    `
      INSERT INTO projects (client_id, name)
      VALUES ($1, $2)
      ON CONFLICT (client_id, name) DO NOTHING
      RETURNING *
    `,
    [clientId, String(name).trim()]
  );

  if (result.rowCount === 0) {
    return res.status(409).json({ message: 'Project already exists for this client.' });
  }

  return res.status(201).json(result.rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ message: 'Invalid project id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Project not found.' });
    }

    await client.query('DELETE FROM equipment_configs WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
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
