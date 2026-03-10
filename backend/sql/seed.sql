-- Password for both users: 123456
INSERT INTO users (name, username, password_hash)
VALUES
  ('Analyst One', 'analyst1', '$2b$10$VwxDNuHUBLNnvbSo5kISJOSWqpYo0fJNZJSYKIGQZNyyQqmbhllHu'),
  ('Analyst Two', 'analyst2', '$2b$10$VwxDNuHUBLNnvbSo5kISJOSWqpYo0fJNZJSYKIGQZNyyQqmbhllHu')
ON CONFLICT (username) DO NOTHING;
