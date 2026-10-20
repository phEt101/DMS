CREATE TABLE IF NOT EXISTS leave_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL COMMENT 'personal, sick, vacation, emergency, ...',
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  balance_bucket ENUM('sick','personal','vacation','other','none') NOT NULL DEFAULT 'none'
    COMMENT 'ตัดจากโควตาใน employees: sick/personal/vacation/other; none=ไม่ตัดโควตา',
  allow_by_hour BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'ลาเป็นชั่วโมงได้ (ลาพักร้อนฉุกเฉิน)',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY leave_types_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประเภทการลา';
