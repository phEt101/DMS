CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสแผนก',
  name VARCHAR(150) NOT NULL COMMENT 'ชื่อแผนก',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'สถานะการใช้งาน: 1=ใช้งาน, 0=ปิดใช้งาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  UNIQUE KEY departments_name_unique (name),
  KEY departments_deleted_at_index (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ข้อมูลแผนกภายในองค์กร';
