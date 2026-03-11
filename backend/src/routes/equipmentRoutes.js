const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { buildExcel, buildPdf } = require('../services/reportService');

const router = express.Router();
const ipRegex =
  /^(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)$/;
const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const vlanRegex = /^(?:[1-9]\d{0,3})$/;

const BASE_SELECT = `
  SELECT
    ec.*,
    cu.name AS configured_by_name,
    vu.name AS validated_by_name,
    c.name AS client_name,
    p.name AS project_name
  FROM equipment_configs ec
  INNER JOIN users cu ON cu.id = ec.configured_by
  LEFT JOIN users vu ON vu.id = ec.validated_by
  LEFT JOIN clients c ON c.id = ec.client_id
  LEFT JOIN projects p ON p.id = ec.project_id
`;

function buildFilters(queryParams) {
  const conditions = [];
  const params = [];

  if (queryParams.status) {
    params.push(String(queryParams.status).toUpperCase());
    conditions.push(`ec.status = $${params.length}`);
  }

  if (queryParams.equipment) {
    params.push(`%${queryParams.equipment}%`);
    conditions.push(`ec.equipment ILIKE $${params.length}`);
  }

  if (queryParams.ip) {
    params.push(`%${queryParams.ip}%`);
    conditions.push(`ec.ip ILIKE $${params.length}`);
  }

  if (queryParams.client_id) {
    const clientId = Number(queryParams.client_id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return { error: 'Invalid client_id filter.' };
    }
    params.push(clientId);
    conditions.push(`ec.client_id = $${params.length}`);
  }

  if (queryParams.project_id) {
    const projectId = Number(queryParams.project_id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return { error: 'Invalid project_id filter.' };
    }
    params.push(projectId);
    conditions.push(`ec.project_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { whereClause, params, error } = buildFilters(req.query);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const query = `${BASE_SELECT}${whereClause} ORDER BY ec.created_at DESC`;
  const result = await pool.query(query, params);
  return res.json(result.rows);
});

router.get('/summary', async (_req, res) => {
  const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
    FROM equipment_configs
  `;

  const result = await pool.query(query);
  return res.json(result.rows[0]);
});

router.get('/export/excel', async (req, res) => {
  const { whereClause, params, error } = buildFilters(req.query);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const result = await pool.query(`${BASE_SELECT}${whereClause} ORDER BY ec.created_at DESC`, params);
  const workbook = buildExcel(result.rows);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="equipment-configs.xlsx"');

  await workbook.xlsx.write(res);
  return res.end();
});

router.get('/export/pdf', async (req, res) => {
  const { whereClause, params, error } = buildFilters(req.query);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const result = await pool.query(`${BASE_SELECT}${whereClause} ORDER BY ec.created_at DESC`, params);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="equipment-report.pdf"');

  await buildPdf(result.rows, res);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }
  const query = `${BASE_SELECT} WHERE ec.id = $1`;
  const result = await pool.query(query, [numericId]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  return res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const {
    client_id: clientId,
    project_id: projectId,
    equipment,
    ip,
    mask,
    gateway,
    vlan,
    service,
    mac,
    username,
    password,
    notes,
  } = req.body;
  const clientIdNumber = Number(clientId);
  const projectIdNumber = Number(projectId);

  if (
    !clientIdNumber ||
    !projectIdNumber ||
    !equipment ||
    !ip ||
    !mask ||
    !gateway ||
    !vlan ||
    !service ||
    !mac ||
    !username ||
    !password
  ) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  if (!Number.isInteger(clientIdNumber) || !Number.isInteger(projectIdNumber)) {
    return res.status(400).json({ message: 'Client and project must be valid IDs.' });
  }

  if (!ipRegex.test(ip) || !ipRegex.test(mask) || !ipRegex.test(gateway)) {
    return res.status(400).json({ message: 'Invalid IP format.' });
  }

  if (!macRegex.test(mac)) {
    return res.status(400).json({ message: 'Invalid MAC format. Use AA:BB:CC:DD:EE:FF.' });
  }

  if (!vlanRegex.test(vlan) || Number(vlan) > 4094) {
    return res.status(400).json({ message: 'Invalid VLAN. Use values from 1 to 4094.' });
  }

  const projectValidation = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND client_id = $2',
    [projectIdNumber, clientIdNumber]
  );
  if (projectValidation.rowCount === 0) {
    return res.status(400).json({ message: 'Selected project does not belong to the selected client.' });
  }

  const query = `
    INSERT INTO equipment_configs
      (
        client_id, project_id, equipment, ip, mask, gateway, vlan, service, mac,
        username, password, configured_by, notes
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const values = [
    clientIdNumber,
    projectIdNumber,
    equipment,
    ip,
    mask,
    gateway,
    vlan,
    service,
    mac,
    username,
    password,
    req.user.id,
    notes || null,
  ];

  const result = await pool.query(query, values);
  return res.status(201).json(result.rows[0]);
});

router.patch('/:id/validate', async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }
  const { notes } = req.body;

  const currentResult = await pool.query('SELECT * FROM equipment_configs WHERE id = $1', [numericId]);
  if (currentResult.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  const config = currentResult.rows[0];

  if (config.configured_by === req.user.id) {
    return res.status(400).json({ message: 'Creator cannot validate the same configuration.' });
  }

  if (config.status !== 'PENDING') {
    return res.status(400).json({ message: 'Only pending configurations can be validated.' });
  }

  const query = `
    UPDATE equipment_configs
    SET status = 'APPROVED', validated_by = $1, validated_at = NOW(), notes = COALESCE($2, notes)
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [req.user.id, notes || null, numericId]);
  return res.json(result.rows[0]);
});

router.patch('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }
  const { notes } = req.body;

  const currentResult = await pool.query('SELECT * FROM equipment_configs WHERE id = $1', [numericId]);
  if (currentResult.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  const config = currentResult.rows[0];

  if (config.configured_by === req.user.id) {
    return res.status(400).json({ message: 'Creator cannot reject the same configuration.' });
  }

  if (config.status !== 'PENDING') {
    return res.status(400).json({ message: 'Only pending configurations can be rejected.' });
  }

  const query = `
    UPDATE equipment_configs
    SET status = 'REJECTED', validated_by = $1, validated_at = NOW(), notes = COALESCE($2, notes)
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [req.user.id, notes || null, numericId]);
  return res.json(result.rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const numericId = Number(req.params.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }

  const result = await pool.query('DELETE FROM equipment_configs WHERE id = $1 RETURNING id', [numericId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  return res.status(204).send();
});

module.exports = router;
