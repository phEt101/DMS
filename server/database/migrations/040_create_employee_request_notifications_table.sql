CREATE TABLE IF NOT EXISTS employee_request_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  event ENUM('submitted','forwarded_to_hr','approved','rejected','cancelled') NOT NULL
    COMMENT 'ฝั่งฟรอนต์ใช้ event + ข้อมูลเอกสารสร้างข้อความตามภาษา',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  email_sent_at TIMESTAMP NULL COMMENT 'NULL=ยังไม่ส่งอีเมล/ไม่ต้องส่ง',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employee_request_notifications_recipient_index (recipient_user_id, is_read, created_at),
  KEY employee_request_notifications_request_index (request_id),
  CONSTRAINT employee_request_notifications_user_fk FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_notifications_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='การแจ้งเตือนในระบบที่เกี่ยวกับเอกสาร';
