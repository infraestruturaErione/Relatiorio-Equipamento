CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_configs (
  id SERIAL PRIMARY KEY,
  equipment VARCHAR(120) NOT NULL,
  ip VARCHAR(45) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_equipment_configs_status ON equipment_configs(status);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_created_at ON equipment_configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_service ON equipment_configs(service);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_equipment ON equipment_configs(equipment);
CREATE INDEX IF NOT EXISTS idx_equipment_configs_ip ON equipment_configs(ip);
