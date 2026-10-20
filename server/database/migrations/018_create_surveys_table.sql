CREATE TABLE IF NOT EXISTS surveys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสแบบสำรวจ',
  survey_no VARCHAR(30) NOT NULL COMMENT 'เลขที่เอกสาร เช่น SV-2026-000123',
  survey_date DATE NOT NULL COMMENT 'วันที่สำรวจ',
  project_name VARCHAR(255) NOT NULL COMMENT 'ชื่อโครงการ/อาคาร',
  floors SMALLINT UNSIGNED NULL COMMENT 'จำนวนชั้นของอาคาร',
  visit_type ENUM('survey_by_sale','survey_by_sale_service') NULL COMMENT 'ประเภทการเยี่ยม: Survey by Sale / Survey by Sale + Service',
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft' COMMENT 'สถานะแบบสำรวจ',
  notes TEXT NULL COMMENT 'หมายเหตุ',
  sign_file_id BIGINT UNSIGNED NULL COMMENT 'รูปป้ายชื่ออาคาร',
  surveyed_by BIGINT UNSIGNED NULL COMMENT 'ผู้สำรวจ (FK users เมื่อมีตาราง users)',
  submitted_at DATETIME NULL COMMENT 'วันที่ส่งแบบสำรวจ',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY surveys_survey_no_unique (survey_no),
  KEY surveys_survey_date_index (survey_date),
  KEY surveys_status_index (status),
  KEY surveys_project_name_index (project_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='แบบสำรวจหน้างาน (ข้อมูลหลัก) — จังหวัดไม่เก็บซ้ำที่นี่ ให้อ่านจาก survey_locations';
