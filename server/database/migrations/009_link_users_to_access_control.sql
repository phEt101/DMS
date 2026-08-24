INSERT INTO roles (name, description, is_system, is_active)
VALUES
  ('Administrator', 'Full system access', TRUE, TRUE),
  ('Manager', 'Manage documents and view reports', TRUE, TRUE),
  ('User', 'Create and manage assigned documents', TRUE, TRUE),
  ('Viewer', 'Read-only access', TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_system = VALUES(is_system),
  is_active = VALUES(is_active),
  deleted_at = NULL;

ALTER TABLE users
  ADD COLUMN role_id BIGINT UNSIGNED NULL AFTER name,
  ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER role_id;

UPDATE users AS users_to_migrate
INNER JOIN roles ON roles.name = CASE users_to_migrate.role
  WHEN 'admin' THEN 'Administrator'
  WHEN 'manager' THEN 'Manager'
  WHEN 'user' THEN 'User'
  WHEN 'viewer' THEN 'Viewer'
END
SET users_to_migrate.role_id = roles.id;

ALTER TABLE users
  MODIFY COLUMN role_id BIGINT UNSIGNED NOT NULL,
  ADD KEY users_role_id_index (role_id),
  ADD KEY users_department_id_index (department_id),
  ADD CONSTRAINT users_role_fk
    FOREIGN KEY (role_id) REFERENCES roles (id),
  ADD CONSTRAINT users_department_fk
    FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  DROP COLUMN role,
  DROP COLUMN department;
