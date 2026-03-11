const express = require('express');
const pool = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { buildExcel, buildPdf } = require('../services/reportService');
const { logAudit } = require('../services/auditService');
const {
  isValidIpv4,
  isValidMac,
  isValidVlan,
} = require('../utils/validation');

const router = express.Router();

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

  if (queryParams.vlan) {
    params.push(`%${queryParams.vlan}%`);
    conditions.push(`ec.vlan ILIKE $${params.length}`);
  }

  if (queryParams.service) {
    params.push(`%${queryParams.service}%`);
    conditions.push(`ec.service ILIKE $${params.length}`);
  }

  if (queryParams.q) {
    params.push(`%${queryParams.q}%`);
    const position = params.length;
    conditions.push(`(
      ec.equipment ILIKE $${position}
      OR ec.ip ILIKE $${position}
      OR ec.vlan ILIKE $${position}
      OR ec.service ILIKE $${position}
      OR c.name ILIKE $${position}
      OR p.name ILIKE $${position}
    )`);
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

  if (queryParams.created_from) {
    params.push(`${queryParams.created_from} 00:00:00`);
    conditions.push(`ec.created_at >= $${params.length}`);
  }

  if (queryParams.created_to) {
    params.push(`${queryParams.created_to} 23:59:59.999`);
    conditions.push(`ec.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

function buildReportMeta(queryParams, totalRecords) {
  const filters = {
    client_id: queryParams.client_id || '',
    project_id: queryParams.project_id || '',
    status: queryParams.status || '',
    equipment: queryParams.equipment || '',
    ip: queryParams.ip || '',
    vlan: queryParams.vlan || '',
    service: queryParams.service || '',
    q: queryParams.q || '',
    created_from: queryParams.created_from || '',
    created_to: queryParams.created_to || '',
  };

  return {
    generated_at: new Date().toISOString(),
    total_records: totalRecords,
    filters,
  };
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

router.get('/dashboard', async (_req, res) => {
  const [summaryRes, recentProjectsRes, pendingByAnalystRes, topClientsRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
      FROM equipment_configs
    `),
    pool.query(`
      SELECT
        p.id,
        p.name,
        p.network_range,
        p.updated_at,
        c.name AS client_name,
        COUNT(ec.id)::int AS total_configs,
        COUNT(*) FILTER (WHERE ec.status = 'PENDING')::int AS pending_configs
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      GROUP BY p.id, c.name
      ORDER BY p.updated_at DESC
      LIMIT 6
    `),
    pool.query(`
      SELECT
        u.id,
        u.name,
        COUNT(ec.id)::int AS pending_count
      FROM users u
      LEFT JOIN equipment_configs ec
        ON ec.status = 'PENDING' AND ec.configured_by <> u.id
      GROUP BY u.id, u.name
      HAVING COUNT(ec.id) > 0
      ORDER BY pending_count DESC, u.name ASC
      LIMIT 6
    `),
    pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(ec.id)::int AS total_configs,
        COUNT(*) FILTER (WHERE ec.status = 'PENDING')::int AS pending_configs
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      LEFT JOIN equipment_configs ec ON ec.project_id = p.id
      GROUP BY c.id, c.name
      ORDER BY total_configs DESC, c.name ASC
      LIMIT 6
    `),
  ]);

  return res.json({
    summary: summaryRes.rows[0],
    recent_projects: recentProjectsRes.rows,
    pending_by_analyst: pendingByAnalystRes.rows,
    top_clients: topClientsRes.rows,
  });
});

router.get('/export/excel', async (req, res) => {
  const { whereClause, params, error } = buildFilters(req.query);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const result = await pool.query(`${BASE_SELECT}${whereClause} ORDER BY ec.created_at DESC`, params);
  const workbook = buildExcel(result.rows, buildReportMeta(req.query, result.rows.length));

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

  await buildPdf(result.rows, res, buildReportMeta(req.query, result.rows.length));
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

  if (!isValidIpv4(ip) || !isValidIpv4(mask) || !isValidIpv4(gateway)) {
    return res.status(400).json({ message: 'Invalid IP format.' });
  }

  if (!isValidMac(mac)) {
    return res.status(400).json({ message: 'Invalid MAC format. Use AA:BB:CC:DD:EE:FF.' });
  }

  if (!isValidVlan(vlan)) {
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
  await logAudit(pool, {
    entityType: 'config',
    entityId: result.rows[0].id,
    action: 'CREATE',
    changedBy: req.user.id,
    afterData: result.rows[0],
  });
  return res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const numericId = Number(req.params.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }

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

  if (!isValidIpv4(ip) || !isValidIpv4(mask) || !isValidIpv4(gateway)) {
    return res.status(400).json({ message: 'Invalid IP format.' });
  }

  if (!isValidMac(mac)) {
    return res.status(400).json({ message: 'Invalid MAC format. Use AA:BB:CC:DD:EE:FF.' });
  }

  if (!isValidVlan(vlan)) {
    return res.status(400).json({ message: 'Invalid VLAN. Use values from 1 to 4094.' });
  }

  const existingResult = await pool.query('SELECT * FROM equipment_configs WHERE id = $1', [numericId]);
  if (existingResult.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  const projectValidation = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND client_id = $2',
    [projectIdNumber, clientIdNumber]
  );
  if (projectValidation.rowCount === 0) {
    return res.status(400).json({ message: 'Selected project does not belong to the selected client.' });
  }

  const result = await pool.query(
    `
      UPDATE equipment_configs
      SET
        client_id = $1,
        project_id = $2,
        equipment = $3,
        ip = $4,
        mask = $5,
        gateway = $6,
        vlan = $7,
        service = $8,
        mac = $9,
        username = $10,
        password = $11,
        notes = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `,
    [
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
      notes || null,
      numericId,
    ]
  );

  await logAudit(pool, {
    entityType: 'config',
    entityId: numericId,
    action: 'UPDATE',
    changedBy: req.user.id,
    beforeData: existingResult.rows[0],
    afterData: result.rows[0],
  });

  return res.json(result.rows[0]);
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
    SET status = 'APPROVED', validated_by = $1, validated_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [req.user.id, notes || null, numericId]);
  await logAudit(pool, {
    entityType: 'config',
    entityId: numericId,
    action: 'VALIDATE',
    changedBy: req.user.id,
    beforeData: config,
    afterData: result.rows[0],
  });
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
    SET status = 'REJECTED', validated_by = $1, validated_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [req.user.id, notes || null, numericId]);
  await logAudit(pool, {
    entityType: 'config',
    entityId: numericId,
    action: 'REJECT',
    changedBy: req.user.id,
    beforeData: config,
    afterData: result.rows[0],
  });
  return res.json(result.rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const numericId = Number(req.params.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ message: 'Invalid configuration id.' });
  }

  const existingResult = await pool.query('SELECT * FROM equipment_configs WHERE id = $1', [numericId]);
  if (existingResult.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  const result = await pool.query('DELETE FROM equipment_configs WHERE id = $1 RETURNING id', [numericId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Configuration not found.' });
  }

  await logAudit(pool, {
    entityType: 'config',
    entityId: numericId,
    action: 'DELETE',
    changedBy: req.user.id,
    beforeData: existingResult.rows[0],
  });

  return res.status(204).send();
});

module.exports = router;
