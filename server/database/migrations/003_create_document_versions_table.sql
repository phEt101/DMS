CREATE TABLE
  IF NOT EXISTS document_versions (
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
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;