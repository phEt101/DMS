SET @announcements_module_name = 'announcements';
SET @announcements_permission_name = 'จัดการประกาศ';

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NULL,
  content MEDIUMTEXT NOT NULL,
  category ENUM('general', 'policy', 'annual', 'monthly') NOT NULL DEFAULT 'general',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  expires_at DATE NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY announcements_company_status_published_index (company_id, status, published_at),
  KEY announcements_author_index (author_id),
  CONSTRAINT announcements_company_fk FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT announcements_author_fk FOREIGN KEY (author_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Company notices and policy updates';

CREATE TABLE IF NOT EXISTS announcement_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_id BIGINT UNSIGNED NOT NULL,
  stored_name CHAR(36) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY announcement_attachments_stored_name_unique (stored_name),
  KEY announcement_attachments_announcement_index (announcement_id),
  CONSTRAINT announcement_attachments_announcement_fk
    FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Files attached to company notices';

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id),
  KEY announcement_reads_user_index (user_id),
  CONSTRAINT announcement_reads_announcement_fk
    FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
  CONSTRAINT announcement_reads_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee read receipts for company notices';

INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
  VALUES (@announcements_module_name, 'FaBullhorn', 0, 1)
  ON DUPLICATE KEY UPDATE icon_name = VALUES(icon_name), is_active = 1, deleted_at = NULL;

INSERT IGNORE INTO department_modules (department_id, module_id)
  SELECT departments.id, permission_modules.id
    FROM departments CROSS JOIN permission_modules
   WHERE permission_modules.name = @announcements_module_name
     AND departments.deleted_at IS NULL AND permission_modules.deleted_at IS NULL;

INSERT INTO permissions (module_id, name, is_active)
  SELECT id, @announcements_permission_name, 1 FROM permission_modules WHERE name = @announcements_module_name
  ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT DISTINCT roles.id, permissions.id
    FROM roles
    JOIN permissions ON permissions.name = @announcements_permission_name AND permissions.deleted_at IS NULL
    JOIN permission_modules ON permission_modules.id = permissions.module_id
      AND permission_modules.name = @announcements_module_name AND permission_modules.deleted_at IS NULL
    LEFT JOIN users ON users.role_id = roles.id AND users.deleted_at IS NULL
    LEFT JOIN departments ON departments.id = users.department_id
      AND departments.name = 'HR Div.' AND departments.deleted_at IS NULL
   WHERE roles.deleted_at IS NULL
     AND (roles.name IN ('admin', 'user') OR departments.id IS NOT NULL);
