CREATE TABLE IF NOT EXISTS survey_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึกกิจกรรมแบบสำรวจ',
  survey_id BIGINT UNSIGNED NULL COMMENT 'รหัสแบบสำรวจ; NULL=แบบสำรวจถูกลบแล้ว',
  survey_no VARCHAR(30) NULL COMMENT 'เลขที่เอกสาร ณ เวลาที่ทำรายการ',
  project_name VARCHAR(255) NULL COMMENT 'ชื่อโครงการ/อาคาร ณ เวลาที่ทำรายการ',
  user_id BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ทำรายการ; NULL=ไม่พบหรือผู้ใช้ถูกลบ',
  action ENUM('created','updated','deleted') NOT NULL COMMENT 'ประเภทการกระทำ: เพิ่ม แก้ไข ลบ',
  details LONGTEXT NULL COMMENT 'รายละเอียดการเปลี่ยนแปลงในรูปแบบ JSON',
  ip_address VARCHAR(45) NULL COMMENT 'หมายเลข IP ของผู้ทำรายการ รองรับ IPv4 และ IPv6',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่เกิดกิจกรรม',
  PRIMARY KEY (id),
  KEY survey_logs_created_at_index (created_at),
  KEY survey_logs_survey_index (survey_id, created_at),
  KEY survey_logs_user_index (user_id),
  CONSTRAINT survey_logs_survey_fk FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE SET NULL,
  CONSTRAINT survey_logs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประวัติการเพิ่ม แก้ไข ลบ แบบสำรวจหน้างาน (ใช้แสดงในหน้าบันทึกกิจกรรม)';
