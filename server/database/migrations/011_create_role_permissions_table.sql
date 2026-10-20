CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสบทบาท',
  permission_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสสิทธิ์ที่กำหนดให้บทบาท',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่กำหนดสิทธิ์',
  PRIMARY KEY (role_id, permission_id),
  KEY role_permissions_permission_index (permission_id),
  CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ความสัมพันธ์ระหว่างบทบาทและสิทธิ์';
