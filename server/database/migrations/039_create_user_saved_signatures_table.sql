CREATE TABLE IF NOT EXISTS user_saved_signatures (
  user_id BIGINT UNSIGNED NOT NULL,
  signature_image MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT user_saved_signatures_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ลายเซ็นล่าสุดที่ผู้ใช้เลือกจดจำ';
