CREATE TABLE IF NOT EXISTS surveys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสแบบสำรวจ',
  survey_no VARCHAR(30) NOT NULL COMMENT 'เลขที่เอกสาร เช่น SV-2026-000123',
  survey_date DATE NOT NULL COMMENT 'วันที่สำรวจ',
  project_name VARCHAR(255) NOT NULL COMMENT 'ชื่อโครงการ/อาคาร',
  floors SMALLINT UNSIGNED NULL COMMENT 'จำนวนชั้นของอาคาร',
  visit_type ENUM('survey_by_sale','survey_by_sale_service') NULL COMMENT 'ประเภทการเยี่ยม: Survey by Sale / Survey by Sale + Service',
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft' COMMENT 'สถานะแบบสำรวจ',
  notes TEXT NULL COMMENT 'หมายเหตุ',
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

-- รูปทั้งหมดเก็บเป็นไฟล์ (disk/S3) แล้วเก็บ path ไว้ ไม่เก็บ base64 ใน DB
CREATE TABLE IF NOT EXISTS survey_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('sign','fcp_overview','fcp_nameplate','fcp_inside','equipment') NOT NULL COMMENT 'รูปนี้ใช้ทำอะไร',
  storage_path VARCHAR(500) NOT NULL COMMENT 'path/key ในที่เก็บไฟล์',
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY survey_files_survey_purpose_index (survey_id, purpose),
  CONSTRAINT survey_files_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ไฟล์รูปของแบบสำรวจ';

ALTER TABLE surveys
  ADD COLUMN sign_file_id BIGINT UNSIGNED NULL COMMENT 'รูปป้ายชื่ออาคาร' AFTER notes,
  ADD CONSTRAINT surveys_sign_file_fk FOREIGN KEY (sign_file_id) REFERENCES survey_files (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS survey_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  seq TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'ลำดับผู้ติดต่อ (1 = หลัก, 2 = สำรอง)',
  name VARCHAR(150) NULL,
  position VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY survey_contacts_unique (survey_id, seq),
  CONSTRAINT survey_contacts_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ผู้ติดต่อหน้างาน';

-- หมายเหตุ: ใน postal_codes  district_name = ตำบล/แขวง, city_name = อำเภอ/เขต
-- ที่นี่ใช้ชื่อตรงตามความหมายเพื่อไม่สับสน และเก็บ snapshot เป็นข้อความไว้ด้วย
-- (ถ้าข้อมูลไปรษณีย์ถูกแก้ภายหลัง แบบสำรวจเก่าจะไม่เปลี่ยนตาม)
CREATE TABLE IF NOT EXISTS survey_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  address_line VARCHAR(255) NULL COMMENT 'เลขที่ / อาคาร / ถนน',
  subdistrict_name VARCHAR(150) NULL COMMENT 'ตำบล/แขวง',
  district_name VARCHAR(150) NULL COMMENT 'อำเภอ/เขต',
  province_name VARCHAR(150) NULL COMMENT 'จังหวัด',
  postal_code CHAR(5) NULL,
  postal_code_id BIGINT UNSIGNED NULL COMMENT 'อ้างอิงแถวใน postal_codes ที่เลือก',
  country_code CHAR(2) NOT NULL DEFAULT 'TH',
  PRIMARY KEY (id),
  UNIQUE KEY survey_locations_survey_unique (survey_id),
  KEY survey_locations_province_index (province_name),
  KEY survey_locations_postal_code_index (postal_code),
  CONSTRAINT survey_locations_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE,
  CONSTRAINT survey_locations_postal_fk FOREIGN KEY (postal_code_id) REFERENCES postal_codes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ตำแหน่งและที่อยู่โครงการ';

CREATE TABLE IF NOT EXISTS survey_fcp (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  brand VARCHAR(100) NULL COMMENT 'ยี่ห้อ FCP',
  model VARCHAR(100) NULL,
  panel_type VARCHAR(100) NULL COMMENT 'ประเภท เช่น Addressable',
  cabinet_material VARCHAR(100) NULL COMMENT 'วัสดุตู้',
  power_status ENUM('on','off') NULL,
  overview_file_id BIGINT UNSIGNED NULL,
  nameplate_file_id BIGINT UNSIGNED NULL,
  inside_file_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY survey_fcp_survey_unique (survey_id),
  KEY survey_fcp_brand_index (brand),
  CONSTRAINT survey_fcp_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE,
  CONSTRAINT survey_fcp_overview_fk FOREIGN KEY (overview_file_id) REFERENCES survey_files (id) ON DELETE SET NULL,
  CONSTRAINT survey_fcp_nameplate_fk FOREIGN KEY (nameplate_file_id) REFERENCES survey_files (id) ON DELETE SET NULL,
  CONSTRAINT survey_fcp_inside_fk FOREIGN KEY (inside_file_id) REFERENCES survey_files (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ข้อมูลตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (FCP)';

-- รายการอุปกรณ์มาตรฐาน (master) เพิ่ม/ปิดรายการได้โดยไม่ต้องแก้โค้ด
CREATE TABLE IF NOT EXISTS equipment_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY equipment_types_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประเภทอุปกรณ์ใน Equipment Checklist';

INSERT IGNORE INTO equipment_types (code, name, sort_order) VALUES
  ('graphic_annunciator', 'Graphic Annunciator', 1),
  ('smoke_detector', 'Smoke Detector', 2),
  ('heat_detector', 'Heat Detector', 3),
  ('manual_detector', 'Manual Detector', 4),
  ('alarm_bell', 'Alarm Bell', 5),
  ('computer', 'Computer', 6),
  ('module_box', 'Module Box', 7);

-- รายการมาตรฐาน: equipment_type_id มีค่า / รายการ "อื่นๆ": equipment_type_id เป็น NULL และใส่ custom_name
CREATE TABLE IF NOT EXISTS survey_equipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  equipment_type_id BIGINT UNSIGNED NULL,
  custom_name VARCHAR(150) NULL COMMENT 'ชื่อที่ผู้สำรวจกรอกเอง (อื่นๆ)',
  is_present TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = ไม่มี, 1 = มี',
  model VARCHAR(100) NULL,
  quantity INT UNSIGNED NULL,
  photo_file_id BIGINT UNSIGNED NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY survey_equipment_type_unique (survey_id, equipment_type_id),
  KEY survey_equipment_type_index (equipment_type_id),
  CONSTRAINT survey_equipment_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE,
  CONSTRAINT survey_equipment_type_fk FOREIGN KEY (equipment_type_id) REFERENCES equipment_types (id),
  CONSTRAINT survey_equipment_photo_fk FOREIGN KEY (photo_file_id) REFERENCES survey_files (id) ON DELETE SET NULL,
  CONSTRAINT survey_equipment_name_chk CHECK (equipment_type_id IS NOT NULL OR custom_name IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ผลตรวจอุปกรณ์ของแต่ละแบบสำรวจ';
