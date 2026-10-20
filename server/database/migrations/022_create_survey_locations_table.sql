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
