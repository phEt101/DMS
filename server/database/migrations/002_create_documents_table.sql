CREATE TABLE
  IF NOT EXISTS documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    document_number VARCHAR(100) NULL,
    original_name VARCHAR(255) NULL,
    stored_name VARCHAR(255) NULL,
    file_path VARCHAR(1000) NULL,
    mime_type VARCHAR(150) NULL,
    file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM ('active', 'trash') NOT NULL DEFAULT 'active',
    uploaded_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY documents_number_unique (document_number),
    KEY documents_deleted_at_index (deleted_at),
    KEY documents_created_at_index (created_at),
    CONSTRAINT documents_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;