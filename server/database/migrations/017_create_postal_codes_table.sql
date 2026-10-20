CREATE TABLE IF NOT EXISTS postal_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการไปรษณีย์',
  postal_code CHAR(5) NOT NULL COMMENT 'รหัสไปรษณีย์ 5 หลัก',
  district_name VARCHAR(150) NOT NULL COMMENT 'ชื่อแขวงหรือตำบล',
  city_name VARCHAR(150) NOT NULL COMMENT 'ชื่อเขตหรืออำเภอ',
  province_name VARCHAR(150) NOT NULL COMMENT 'ชื่อจังหวัด',
  country_code CHAR(2) NOT NULL DEFAULT 'TH' COMMENT 'รหัสประเทศ ISO 3166-1 alpha-2',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้างข้อมูล',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขข้อมูลล่าสุด',
  PRIMARY KEY (id),
  UNIQUE KEY postal_codes_unique (postal_code, district_name, city_name, province_name, country_code),
  KEY postal_codes_postal_code_index (postal_code),
  KEY postal_codes_district_name_index (district_name),
  KEY postal_codes_city_name_index (city_name),
  KEY postal_codes_province_name_index (province_name),
  KEY postal_codes_country_code_index (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ข้อมูลรหัสไปรษณีย์ตามข้อมูลกรมไปรษณีย์';
