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
