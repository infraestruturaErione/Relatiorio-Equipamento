const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const ipRegex =
  /^(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)$/;

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
        p.network_range,
        p.mask,
        p.gateway,
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
        p.network_range,
        p.mask,
        p.gateway,
        p.created_at,
        c.name AS client_name,
        1::int AS projects_count,
        COUNT(ec.id)::int AS configs_count,
        COUNT(ec.id)::int AS total_configs,
        COUNT(*) FILTER (WHERE ec.status = 'PENDING')::int AS pending_configs,
        COUNT(*) FILTER (WHERE ec.status = 'APPROVED')::int AS approved_configs,
        COUNT(*) FILTER (WHERE ec.status = 'REJECTED')::int AS rejected_configs
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name
    `,
    [projectId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  return res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const {
    client_id: clientId,
    name,
    network_range: networkRange,
    mask,
    gateway,
  } = req.body;

  if (
    !clientId ||
    !name ||
    !String(name).trim() ||
    !networkRange ||
    !String(networkRange).trim() ||
    !mask ||
    !String(mask).trim() ||
    !gateway ||
    !String(gateway).trim()
  ) {
    return res.status(400).json({ message: 'Client, project name, network range, mask and gateway are required.' });
  }

  if (!ipRegex.test(String(mask).trim()) || !ipRegex.test(String(gateway).trim())) {
    return res.status(400).json({ message: 'Mask and gateway must be valid IPv4 values.' });
  }

  const clientResult = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
  if (clientResult.rowCount === 0) {
    return res.status(400).json({ message: 'Client not found.' });
  }

  const result = await pool.query(
    `
      INSERT INTO projects (client_id, name, network_range, mask, gateway)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (client_id, name) DO NOTHING
      RETURNING *
    `,
    [
      clientId,
      String(name).trim(),
      String(networkRange).trim(),
      String(mask).trim(),
      String(gateway).trim(),
    ]
  );

  if (result.rowCount === 0) {
    return res.status(409).json({ message: 'Project already exists for this client.' });
  }

  return res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const projectId = Number(req.params.id);
  const { name, network_range: networkRange, mask, gateway } = req.body;

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ message: 'Invalid project id.' });
  }

  if (
    !name ||
    !String(name).trim() ||
    !networkRange ||
    !String(networkRange).trim() ||
    !mask ||
    !String(mask).trim() ||
    !gateway ||
    !String(gateway).trim()
  ) {
    return res.status(400).json({ message: 'Project name, network range, mask and gateway are required.' });
  }

  if (!ipRegex.test(String(mask).trim()) || !ipRegex.test(String(gateway).trim())) {
    return res.status(400).json({ message: 'Mask and gateway must be valid IPv4 values.' });
  }

  const existingResult = await pool.query(
    'SELECT id, client_id FROM projects WHERE id = $1',
    [projectId]
  );

  if (existingResult.rowCount === 0) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const existingProject = existingResult.rows[0];
  const duplicateResult = await pool.query(
    'SELECT id FROM projects WHERE client_id = $1 AND name = $2 AND id <> $3',
    [existingProject.client_id, String(name).trim(), projectId]
  );

  if (duplicateResult.rowCount > 0) {
    return res.status(409).json({ message: 'Project already exists for this client.' });
  }

  const result = await pool.query(
    `
      UPDATE projects
      SET name = $1, network_range = $2, mask = $3, gateway = $4
      WHERE id = $5
      RETURNING *
    `,
    [
      String(name).trim(),
      String(networkRange).trim(),
      String(mask).trim(),
      String(gateway).trim(),
      projectId,
    ]
  );

  return res.json(result.rows[0]);
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
