CREATE TABLE IF NOT EXISTS document_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทเอกสาร (PK)',
  name VARCHAR(150) NOT NULL COMMENT 'ชื่อประเภทเอกสาร เช่น เอกสารทั่วไป, โครงการ PM',
  department_id BIGINT UNSIGNED NULL COMMENT 'รหัสแผนกที่ใช้ประเภทเอกสารนี้; NULL=ใช้ได้ทุกแผนก',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'สถานะการใช้งาน: 1=ใช้งาน, 0=ปิดใช้งาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'สถานะลบแบบ soft delete: 0=ใช้งาน, 1=ลบแล้ว',
  PRIMARY KEY (id),
  UNIQUE KEY document_types_name_is_deleted_unique (name, is_deleted),
  KEY document_types_department_id_index (department_id),
  KEY document_types_is_deleted_index (is_deleted),
  KEY document_types_deleted_at_index (deleted_at),
  CONSTRAINT document_types_department_fk FOREIGN KEY (department_id)
    REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประเภทเอกสารที่ผู้ใช้งานสามารถสร้างได้';
