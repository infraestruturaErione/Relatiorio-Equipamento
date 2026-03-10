CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ANALYST' CHECK (role IN ('ADMIN', 'ANALYST')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, name)
);

CREATE TABLE IF NOT EXISTS equipment_configs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  equipment VARCHAR(120) NOT NULL,
  ip_start VARCHAR(45) NOT NULL,
  ip_end VARCHAR(45) NOT NULL,
  mask VARCHAR(45) NOT NULL,
  gateway VARCHAR(45) NOT NULL,
  vlan VARCHAR(50) NOT NULL,
  service VARCHAR(120) NOT NULL,
  mac VARCHAR(45) NOT NULL,
  username VARCHAR(120) NOT NULL,
  password VARCHAR(120) NOT NULL,
  configured_by INTEGER NOT NULL REFERENCES users(id),
  validated_by INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMP
);

ALTER TABLE equipment_configs
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
ALTER TABLE equipment_configs
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
ALTER TABLE equipment_configs
  ADD COLUMN IF NOT EXISTS ip_start VARCHAR(45);
ALTER TABLE equipment_configs
  ADD COLUMN IF NOT EXISTS ip_end VARCHAR(45);
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ANALYST';
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'ANALYST'));
UPDATE users SET role = 'ANALYST' WHERE role IS NULL;
ALTER TABLE equipment_configs
  DROP COLUMN IF EXISTS ip;

CREATE INDEX IF NOT EXISTS idx_equipment_configs_status ON equipment_configs(status);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_created_at ON equipment_configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_service ON equipment_configs(service);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_equipment ON equipment_configs(equipment);
DROP INDEX IF EXISTS idx_equipment_configs_ip;
CREATE INDEX IF NOT EXISTS idx_equipment_configs_ip_start ON equipment_configs(ip_start);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_ip_end ON equipment_configs(ip_end);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_client_id ON equipment_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_project_id ON equipment_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
