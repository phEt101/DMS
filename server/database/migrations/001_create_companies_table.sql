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
