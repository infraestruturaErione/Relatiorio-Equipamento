const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/global', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ clients: [], projects: [], configs: [] });
  }

  const term = `%${q}%`;
  const [clientsRes, projectsRes, configsRes] = await Promise.all([
    pool.query(
      `
        SELECT id, name, created_at
        FROM clients
        WHERE name ILIKE $1
        ORDER BY updated_at DESC, name ASC
        LIMIT 8
      `,
      [term]
    ),
    pool.query(
      `
        SELECT p.id, p.name, p.network_range, c.name AS client_name
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        WHERE p.name ILIKE $1 OR c.name ILIKE $1 OR p.network_range ILIKE $1
        ORDER BY p.updated_at DESC, p.name ASC
        LIMIT 8
      `,
      [term]
    ),
    pool.query(
      `
        SELECT
          ec.id,
          ec.equipment,
          ec.ip,
          ec.vlan,
          ec.service,
          ec.status,
          c.name AS client_name,
          p.name AS project_name
        FROM equipment_configs ec
        LEFT JOIN clients c ON c.id = ec.client_id
        LEFT JOIN projects p ON p.id = ec.project_id
        WHERE
          ec.equipment ILIKE $1
          OR ec.ip ILIKE $1
          OR ec.vlan ILIKE $1
          OR ec.service ILIKE $1
          OR c.name ILIKE $1
          OR p.name ILIKE $1
        ORDER BY ec.updated_at DESC, ec.id DESC
        LIMIT 8
      `,
      [term]
    ),
  ]);

  return res.json({
    clients: clientsRes.rows,
    projects: projectsRes.rows,
    configs: configsRes.rows,
  });
});

module.exports = router;
