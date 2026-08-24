CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY departments_code_unique (code),
  UNIQUE KEY departments_name_unique (name),
  KEY departments_deleted_at_index (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
