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
