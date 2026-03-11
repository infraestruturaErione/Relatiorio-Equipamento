const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const params = [];
  const conditions = [];

  if (req.query.entity_type) {
    params.push(String(req.query.entity_type));
    conditions.push(`al.entity_type = $${params.length}`);
  }

  if (req.query.entity_id) {
    const entityId = Number(req.query.entity_id);
    if (!Number.isInteger(entityId) || entityId <= 0) {
      return res.status(400).json({ message: 'Invalid entity_id filter.' });
    }
    params.push(entityId);
    conditions.push(`al.entity_id = $${params.length}`);
  }

  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    const position = params.length;
    conditions.push(`(
      al.summary ILIKE $${position}
      OR COALESCE(c.name, '') ILIKE $${position}
      OR COALESCE(p.name, '') ILIKE $${position}
      OR COALESCE(ec.equipment, '') ILIKE $${position}
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        al.*,
        u.name AS changed_by_name,
        c.name AS client_name,
        p.name AS project_name,
        ec.equipment AS equipment_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.changed_by
      LEFT JOIN clients c ON al.entity_type = 'client' AND c.id = al.entity_id
      LEFT JOIN projects p ON al.entity_type = 'project' AND p.id = al.entity_id
      LEFT JOIN equipment_configs ec ON al.entity_type = 'config' AND ec.id = al.entity_id
      ${whereClause}
      ORDER BY al.changed_at DESC
      LIMIT 100
    `,
    params
  );

  return res.json(result.rows);
});

module.exports = router;
