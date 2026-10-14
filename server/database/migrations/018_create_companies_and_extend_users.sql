CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Company identifier',
  name VARCHAR(150) NOT NULL COMMENT 'Company display name',
  logo_url VARCHAR(2048) NULL COMMENT 'Company logo URL used in the sidebar',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether the company is active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY companies_name_unique (name),
  KEY companies_deleted_at_index (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Companies and tenant branding';

INSERT INTO companies (name, is_active)
VALUES ('Boswell', 1)
ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'first_name') = 0,
  'ALTER TABLE users ADD COLUMN first_name VARCHAR(150) NULL AFTER name',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_name') = 0,
  'ALTER TABLE users ADD COLUMN last_name VARCHAR(150) NULL AFTER first_name',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'company_id') = 0,
  'ALTER TABLE users ADD COLUMN company_id BIGINT UNSIGNED NULL AFTER department_id',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

UPDATE users
SET first_name = SUBSTRING_INDEX(TRIM(name), ' ', 1),
    last_name = CASE
      WHEN LOCATE(' ', TRIM(name)) > 0 THEN TRIM(SUBSTRING(TRIM(name), LOCATE(' ', TRIM(name)) + 1))
      ELSE ''
    END,
    company_id = (SELECT id FROM companies WHERE name = 'Boswell' LIMIT 1)
WHERE company_id IS NULL OR first_name IS NULL OR last_name IS NULL;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'users_company_id_index') = 0,
  'ALTER TABLE users ADD KEY users_company_id_index (company_id)',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'first_name' AND is_nullable = 'YES') > 0,
  'ALTER TABLE users MODIFY COLUMN first_name VARCHAR(150) NOT NULL',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_name' AND is_nullable = 'YES') > 0,
  'ALTER TABLE users MODIFY COLUMN last_name VARCHAR(150) NOT NULL',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'company_id' AND is_nullable = 'YES') > 0,
  'ALTER TABLE users MODIFY COLUMN company_id BIGINT UNSIGNED NOT NULL',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @migration_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'users' AND constraint_name = 'users_company_fk') = 0,
  'ALTER TABLE users ADD CONSTRAINT users_company_fk FOREIGN KEY (company_id) REFERENCES companies (id)',
  'SELECT 1'
);
PREPARE migration_stmt FROM @migration_ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @modules_sort_order = (SELECT sort_order FROM permission_modules WHERE name = 'modules' LIMIT 1);
UPDATE permission_modules
SET sort_order = @modules_sort_order + 2
WHERE name = 'activity_logs'
  AND @modules_sort_order IS NOT NULL
  AND sort_order <= @modules_sort_order + 1;

INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
SELECT 'companies', 'FaBuilding', COALESCE(@modules_sort_order + 1, COALESCE(MAX(sort_order), 0) + 1), 1
FROM permission_modules
ON DUPLICATE KEY UPDATE icon_name = VALUES(icon_name), sort_order = VALUES(sort_order), is_active = 1, deleted_at = NULL;

INSERT INTO permissions (name, module_id)
SELECT 'เข้าถึงเมนูบริษัท', id FROM permission_modules WHERE name = 'companies' AND deleted_at IS NULL
ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL;

INSERT INTO permissions (name, module_id)
SELECT company_actions.permission_name, permission_modules.id
FROM permission_modules
CROSS JOIN (
  SELECT 'เพิ่มบริษัท' AS permission_name
  UNION ALL SELECT 'แก้ไขบริษัท'
  UNION ALL SELECT 'ลบบริษัท'
) AS company_actions
WHERE permission_modules.name = 'companies' AND permission_modules.deleted_at IS NULL
ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin'
  AND permissions.name IN ('เข้าถึงเมนูบริษัท', 'เพิ่มบริษัท', 'แก้ไขบริษัท', 'ลบบริษัท')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;
