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
