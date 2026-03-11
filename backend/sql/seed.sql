-- Password for both users: 123456
INSERT INTO users (name, username, password_hash, role)
VALUES
  ('Admin One', 'admin1', '$2b$10$VwxDNuHUBLNnvbSo5kISJOSWqpYo0fJNZJSYKIGQZNyyQqmbhllHu', 'ADMIN'),
  ('Analyst One', 'analyst1', '$2b$10$VwxDNuHUBLNnvbSo5kISJOSWqpYo0fJNZJSYKIGQZNyyQqmbhllHu', 'ANALYST'),
  ('Analyst Two', 'analyst2', '$2b$10$VwxDNuHUBLNnvbSo5kISJOSWqpYo0fJNZJSYKIGQZNyyQqmbhllHu', 'ANALYST')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO clients (name, ip, mask, gateway)
VALUES
  ('Client Alpha', '192.168.10.10', '255.255.255.0', '192.168.10.1'),
  ('Client Beta', '10.10.0.10', '255.255.255.0', '10.10.0.1')
ON CONFLICT (name) DO UPDATE
SET
  ip = EXCLUDED.ip,
  mask = EXCLUDED.mask,
  gateway = EXCLUDED.gateway;

INSERT INTO projects (client_id, name, network_range, mask, gateway)
SELECT c.id, p.project_name, p.network_range, p.mask, p.gateway
FROM clients c
JOIN (
  VALUES
    ('Client Alpha', 'Core Expansion', '192.168.10.0/24', '255.255.255.0', '192.168.10.1'),
    ('Client Alpha', 'Branch Retrofit', '192.168.20.0/24', '255.255.255.0', '192.168.20.1'),
    ('Client Beta', 'Datacenter Migration', '10.10.0.0/24', '255.255.255.0', '10.10.0.1')
) AS p(client_name, project_name, network_range, mask, gateway) ON p.client_name = c.name
ON CONFLICT (client_id, name) DO UPDATE
SET
  network_range = EXCLUDED.network_range,
  mask = EXCLUDED.mask,
  gateway = EXCLUDED.gateway;
