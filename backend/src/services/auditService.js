function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null;
  return JSON.parse(JSON.stringify(record));
}

function buildSummary(entityType, action, beforeData, afterData) {
  const entityLabel = {
    client: 'Cliente',
    project: 'Projeto',
    config: 'Configuracao',
  }[entityType] || entityType;

  if (action === 'CREATE') {
    return `${entityLabel} criado`;
  }

  if (action === 'DELETE') {
    return `${entityLabel} excluido`;
  }

  if (action === 'VALIDATE') {
    return `${entityLabel} validado`;
  }

  if (action === 'REJECT') {
    return `${entityLabel} reprovado`;
  }

  if (action === 'UPDATE') {
    const before = normalizeRecord(beforeData) || {};
    const after = normalizeRecord(afterData) || {};
    const changedKeys = Object.keys(after).filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
    );

    if (changedKeys.length === 0) {
      return `${entityLabel} atualizado`;
    }

    return `${entityLabel} atualizado: ${changedKeys.slice(0, 5).join(', ')}`;
  }

  return `${entityLabel} ${action.toLowerCase()}`;
}

async function logAudit(pool, {
  entityType,
  entityId,
  action,
  changedBy,
  beforeData = null,
  afterData = null,
  summary,
}) {
  await pool.query(
    `
      INSERT INTO audit_logs (
        entity_type, entity_id, action, summary, changed_by, before_data, after_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      entityType,
      entityId,
      action,
      summary || buildSummary(entityType, action, beforeData, afterData),
      changedBy || null,
      normalizeRecord(beforeData),
      normalizeRecord(afterData),
    ]
  );
}

module.exports = { buildSummary, logAudit, normalizeRecord };
