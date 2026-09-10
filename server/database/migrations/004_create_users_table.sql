CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้งาน',
  email VARCHAR(190) NOT NULL COMMENT 'อีเมลสำหรับเข้าสู่ระบบ',
  password_hash VARCHAR(255) NULL COMMENT 'รหัสผ่านที่ผ่านการแฮช; NULL=ยังไม่ได้กำหนดรหัสผ่าน',
  name VARCHAR(150) NOT NULL COMMENT 'ชื่อที่ใช้แสดงในระบบ',
  role_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสบทบาทของผู้ใช้งาน',
  department_id BIGINT UNSIGNED NULL COMMENT 'รหัสแผนกของผู้ใช้งาน; NULL=ไม่สังกัดแผนก',
  phone VARCHAR(30) NULL COMMENT 'หมายเลขโทรศัพท์',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'สถานะการใช้งาน: 1=ใช้งาน, 0=ปิดใช้งาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  KEY users_role_id_index (role_id),
  KEY users_department_id_index (department_id),
  KEY users_deleted_at_index (deleted_at),
  CONSTRAINT users_role_fk FOREIGN KEY (role_id) REFERENCES roles (id),
  CONSTRAINT users_department_fk FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='บัญชีผู้ใช้งานระบบ';
