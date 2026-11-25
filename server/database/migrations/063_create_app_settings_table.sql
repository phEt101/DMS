-- ตารางการตั้งค่าระดับระบบ (key/value) สำหรับ admin เปิด/ปิดฟีเจอร์ในหน้าตั้งค่า
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL COMMENT 'ชื่อการตั้งค่า เช่น auth.reset_password_enabled',
  setting_value VARCHAR(255) NOT NULL COMMENT 'ค่าของการตั้งค่า (ข้อความ)',
  updated_by BIGINT UNSIGNED NULL COMMENT 'ผู้ใช้งานที่แก้ไขล่าสุด; NULL=ค่าเริ่มต้นจากระบบ',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (setting_key),
  CONSTRAINT app_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='การตั้งค่าระดับระบบ';

-- ค่าเริ่มต้น: ปิดหน้ารีเซ็ทรหัสผ่านไว้ก่อน (จนกว่า admin จะเปิด)
INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('auth.reset_password_enabled', 'false');
