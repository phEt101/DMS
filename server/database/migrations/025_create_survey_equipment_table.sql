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
