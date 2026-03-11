ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE equipment_configs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE clients SET updated_at = COALESCE(updated_at, created_at, NOW());
UPDATE projects SET updated_at = COALESCE(updated_at, created_at, NOW());
UPDATE equipment_configs SET updated_at = COALESCE(updated_at, created_at, NOW());

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(40) NOT NULL,
  summary TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  before_data JSONB,
  after_data JSONB,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
