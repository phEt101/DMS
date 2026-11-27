-- สิทธิ์รายบุคคล (User access overrides)
-- เพิ่ม/ถอด หน้าจอ (modules) และสิทธิ์การทำงาน (permissions) ของ "ผู้ใช้งานแต่ละคน"
-- เหนือกว่าสิทธิ์ที่ได้จากบทบาท (role_permissions) และแผนก (department_modules)
-- - grant: ให้เพิ่มสิทธิ์พิเศษแก่คนเดียว (แม้บทบาท/แผนกไม่มี)
-- - deny : ถอดสิทธิ์เฉพาะคนนั้น (แม้บทบาท/แผนกมี)

CREATE TABLE IF NOT EXISTS user_module_overrides (
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสผู้ใช้งาน',
  module_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสโมดูล (หน้าจอ)',
  effect ENUM('grant', 'deny') NOT NULL COMMENT 'grant=เพิ่มสิทธิ์พิเศษ, deny=ถอดสิทธิ์',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่กำหนด',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (user_id, module_id),
  KEY user_module_overrides_module_index (module_id),
  CONSTRAINT user_module_overrides_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_module_overrides_module_fk FOREIGN KEY (module_id) REFERENCES permission_modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='หน้าจอที่เพิ่ม/ถอดเฉพาะรายบุคคล (ทับสิทธิ์บทบาทและแผนก)';

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสผู้ใช้งาน',
  permission_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสสิทธิ์การทำงาน',
  effect ENUM('grant', 'deny') NOT NULL COMMENT 'grant=เพิ่มสิทธิ์พิเศษ, deny=ถอดสิทธิ์',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่กำหนด',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (user_id, permission_id),
  KEY user_permission_overrides_permission_index (permission_id),
  CONSTRAINT user_permission_overrides_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_permission_overrides_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='สิทธิ์ที่เพิ่ม/ถอดเฉพาะรายบุคคล (ทับสิทธิ์บทบาท)';
