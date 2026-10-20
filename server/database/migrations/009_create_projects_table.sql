CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสโครงการ',
  encrypted_id CHAR(43) NOT NULL COMMENT 'รหัสสาธารณะของโครงการที่สร้างจาก HMAC-SHA256',
  project_type_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสประเภทโครงการ',
  department_id BIGINT UNSIGNED NULL COMMENT 'รหัสแผนกที่เข้าถึงโครงการ; NULL=โครงการส่วนกลาง',
  project_manager_name VARCHAR(191) NULL COMMENT 'ชื่อผู้จัดการโครงการ',
  customer_name VARCHAR(191) NULL COMMENT 'ชื่อลูกค้าหรือผู้ว่าจ้าง',
  status ENUM('draft','approved','archived','trash') NOT NULL DEFAULT 'draft' COMMENT 'สถานะโครงการ: draft=ร่าง, approved=อนุมัติแล้ว, archived=เก็บถาวร, trash=อยู่ในถังขยะ',
  created_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่สร้างโครงการ',
  updated_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่แก้ไขโครงการล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ลบโครงการ',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  PRIMARY KEY (id),
  UNIQUE KEY projects_encrypted_id_unique (encrypted_id),
  KEY projects_project_type_id_index (project_type_id),
  KEY projects_department_id_index (department_id),
  KEY projects_project_manager_name_index (project_manager_name),
  KEY projects_customer_name_index (customer_name),
  KEY projects_status_index (status),
  KEY projects_created_at_index (created_at),
  KEY projects_deleted_at_index (deleted_at),
  CONSTRAINT projects_project_type_fk FOREIGN KEY (project_type_id)
    REFERENCES project_types (id),
  CONSTRAINT projects_department_fk FOREIGN KEY (department_id)
    REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT projects_created_by_fk FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT projects_updated_by_fk FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT projects_deleted_by_fk FOREIGN KEY (deleted_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ข้อมูลโครงการหลักทุกประเภท';
