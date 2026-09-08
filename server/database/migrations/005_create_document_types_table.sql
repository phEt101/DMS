CREATE TABLE IF NOT EXISTS document_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทเอกสาร (PK)',
  name VARCHAR(150) NOT NULL COMMENT 'ชื่อประเภทเอกสาร เช่น เอกสารทั่วไป, โครงการ PM',
  department_id BIGINT UNSIGNED NULL COMMENT 'แผนกที่ใช้แม่พิมพ์นี้ได้ — NULL=ทุกฝ่ายใช้สร้างได้หมด, X=เฉพาะแผนก X เท่านั้น',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'เปิดใช้งานแม่พิมพ์นี้หรือไม่ (0=ปิด ไม่แสดง Dropdown สร้างเอกสารใหม่)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'สร้างเมื่อ',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'แก้ไขล่าสุดเมื่อ',
  deleted_at TIMESTAMP NULL COMMENT 'Soft Delete เวลาที่ลบแม่พิมพ์ (NULL=ยังใช้งานอยู่)',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'DBA Flag Soft Delete ควบคุม UNIQUE Composite Key แก้ MySQL NULL!=NULL Bug (0=ใช้งาน, 1=ลบแล้ว)',
  PRIMARY KEY (id),
  UNIQUE KEY document_types_name_is_deleted_unique (name, is_deleted),
  KEY document_types_department_id_index (department_id),
  KEY document_types_is_deleted_index (is_deleted),
  KEY document_types_deleted_at_index (deleted_at),
  CONSTRAINT document_types_department_fk FOREIGN KEY (department_id)
    REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='L0 แม่พิมพ์ประเภทเอกสาร; DBA is_deleted TINYINT(1) + UNIQUE(name,is_deleted) Composite แก้ NULL!=NULL; department_id NULL=ทุกฝ่ายใช้ได้';
