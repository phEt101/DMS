CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสเอกสาร',
  document_type_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสประเภทเอกสาร',
  department_id BIGINT UNSIGNED NULL COMMENT 'รหัสแผนกที่เข้าถึงเอกสาร; NULL=เอกสารส่วนกลาง',
  project_manager_name VARCHAR(191) NULL COMMENT 'ชื่อผู้จัดการโครงการ',
  customer_name VARCHAR(191) NULL COMMENT 'ชื่อลูกค้าหรือผู้ว่าจ้าง',
  status ENUM('draft','approved','archived','trash') NOT NULL DEFAULT 'draft' COMMENT 'สถานะเอกสาร: draft=ร่าง ยังแก้ไขได้, approved=อนุมัติแล้ว, archived=เก็บถาวร, trash=อยู่ในถังขยะ',
  created_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่สร้างเอกสาร',
  updated_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่แก้ไขเอกสารล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ลบเอกสาร',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  KEY documents_document_type_id_index (document_type_id),
  KEY documents_department_id_index (department_id),
  KEY documents_project_manager_name_index (project_manager_name),
  KEY documents_customer_name_index (customer_name),
  KEY documents_status_index (status),
  KEY documents_created_at_index (created_at),
  KEY documents_deleted_at_index (deleted_at),
  CONSTRAINT documents_document_type_fk FOREIGN KEY (document_type_id)
    REFERENCES document_types (id),
  CONSTRAINT documents_department_fk FOREIGN KEY (department_id)
    REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT documents_created_by_fk FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_updated_by_fk FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_deleted_by_fk FOREIGN KEY (deleted_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ข้อมูลเอกสารหลักทุกประเภท';
