CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสเอกสาร (PK L1 Shared Parent)',
  document_type_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสประเภทเอกสาร FK L0 document_types.id (1=เอกสารทั่วไป, 2=โครงการ PM)',
  department_id BIGINT UNSIGNED NULL COMMENT 'แผนกที่เห็นเอกสารนี้ — NULL=เอกสารกลาง ทุกฝ่ายเห็นหมด, X=เฉพาะแผนก X เห็น + Admin เห็นเสมอ',
  project_manager_name VARCHAR(191) NULL COMMENT 'ชื่อผู้จัดการโครงการ (ช่วงเริ่มต้นเก็บ VARCHAR ก่อน อนาคตข้อมูลครบ migrate เป็น FK user_id); DBA ลด 200→191 utf8mb4 767 bytes limit เพราะมี Index',
  customer_name VARCHAR(191) NULL COMMENT 'ชื่อลูกค้า / ผู้ว่าจ้าง (ช่วงเริ่มต้นเก็บ VARCHAR ก่อน อนาคต migrate เป็น FK customer_id); DBA ลด 255→191 utf8mb4 767 bytes limit เพราะมี Index',
  status ENUM('draft','approved','archived','trash') NOT NULL DEFAULT 'draft' COMMENT 'สถานะเอกสาร: draft=ร่าง ยังแก้ไขได้, approved=อนุมัติแล้ว, archived=เก็บถาวร, trash=อยู่ในถังขยะ',
  created_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครเป็นคนสร้างเอกสารนี้',
  updated_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครแก้ไขล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครเป็นคนลบเอกสารนี้',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'สร้างเมื่อ',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'แก้ไขล่าสุดเมื่อ',
  deleted_at TIMESTAMP NULL COMMENT 'Soft Delete เวลาที่ลบ (NULL=ยังใช้งานอยู่)',
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
COMMENT='L1 Shared Parent ตารางแม่ ทุกประเภทเอกสารใช้ร่วมกัน 100% (แสดงหน้า List รวมทุกประเภท); เก็บ PM Name + Customer Name ช่วงเริ่มต้นเป็น VARCHAR ก่อน ไม่ต้อง FK users/customers table';
