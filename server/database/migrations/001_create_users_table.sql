CREATE TABLE
  IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(150) NOT NULL,
    role ENUM ('admin', 'manager', 'user', 'viewer') NOT NULL DEFAULT 'user',
    department VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email),
    KEY users_deleted_at_index (deleted_at)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;