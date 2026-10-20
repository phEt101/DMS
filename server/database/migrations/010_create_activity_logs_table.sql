CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึกกิจกรรม',
  user_id BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ทำรายการ; NULL=ไม่พบหรือผู้ใช้ถูกลบ',
  module VARCHAR(80) NOT NULL COMMENT 'โมดูลที่เกิดกิจกรรม',
  action VARCHAR(80) NOT NULL COMMENT 'ประเภทการกระทำ เช่น created, updated หรือ deleted',
  entity_type VARCHAR(80) NOT NULL COMMENT 'ประเภทข้อมูลที่ถูกกระทำ',
  entity_id BIGINT UNSIGNED NULL COMMENT 'รหัสข้อมูลที่ถูกกระทำ; NULL=กิจกรรมที่ไม่มีข้อมูลเป้าหมาย',
  details LONGTEXT NULL COMMENT 'รายละเอียดกิจกรรมในรูปแบบ JSON',
  ip_address VARCHAR(45) NULL COMMENT 'หมายเลข IP ของผู้ทำรายการ รองรับ IPv4 และ IPv6',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่เกิดกิจกรรม',
  PRIMARY KEY (id),
  KEY activity_created_at_index (created_at),
  KEY activity_module_created_at_index (module, created_at),
  KEY activity_entity_index (entity_type, entity_id),
  CONSTRAINT activity_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประวัติกิจกรรมของผู้ใช้งานในระบบ';
