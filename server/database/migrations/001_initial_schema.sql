CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NULL,
  display_name VARCHAR(150) NOT NULL,
  role ENUM('admin', 'manager', 'user', 'viewer') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  document_number VARCHAR(100) NULL,
  original_name VARCHAR(255) NULL,
  stored_name VARCHAR(255) NULL,
  file_path VARCHAR(1000) NULL,
  mime_type VARCHAR(150) NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active', 'trash') NOT NULL DEFAULT 'active',
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY documents_number_unique (document_number),
  KEY documents_deleted_at_index (deleted_at),
  KEY documents_created_at_index (created_at),
  CONSTRAINT documents_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE document_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(150) NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY document_versions_unique (document_id, version_number),
  CONSTRAINT versions_document_fk FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT versions_user_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY activity_created_at_index (created_at),
  KEY activity_entity_index (entity_type, entity_id),
  CONSTRAINT activity_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
