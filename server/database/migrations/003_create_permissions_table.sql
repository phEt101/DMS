CREATE TABLE IF NOT EXISTS permission_modules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสโมดูลสิทธิ์',
  name VARCHAR(80) NOT NULL COMMENT 'ชื่ออ้างอิงของโมดูล',
  icon_name VARCHAR(100) NULL DEFAULT NULL COMMENT 'ชื่อไอคอนที่ใช้แสดงโมดูล',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'สถานะการใช้งาน: 1=ใช้งาน, 0=ปิดใช้งาน',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ลำดับการแสดงผล; ค่าน้อยแสดงก่อน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  UNIQUE KEY permission_modules_name_unique (name),
  KEY permission_modules_sort_order_index (sort_order),
  KEY permission_modules_deleted_at_index (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='โมดูลสำหรับจัดกลุ่มสิทธิ์การใช้งาน';

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสสิทธิ์',
  module_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสโมดูลที่เป็นเจ้าของสิทธิ์',
  name VARCHAR(150) NOT NULL COMMENT 'ชื่อสิทธิ์การใช้งาน',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'สถานะการใช้งาน: 1=ใช้งาน, 0=ปิดใช้งาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  UNIQUE KEY permissions_module_name_unique (module_id, name),
  KEY permissions_module_index (module_id),
  KEY permissions_deleted_at_index (deleted_at),
  CONSTRAINT permissions_module_fk FOREIGN KEY (module_id) REFERENCES permission_modules (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='สิทธิ์การใช้งานที่จัดกลุ่มตามโมดูล';
