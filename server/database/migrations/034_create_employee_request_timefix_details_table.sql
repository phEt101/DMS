CREATE TABLE IF NOT EXISTS employee_request_timefix_details (
  request_id BIGINT UNSIGNED NOT NULL,
  fix_date DATE NOT NULL COMMENT 'วันที่ต้องการแก้ไข',
  cause ENUM('forgot','device','offsite','other') NOT NULL,
  in_time TIME NULL,
  out_time TIME NULL,
  PRIMARY KEY (request_id),
  KEY employee_request_timefix_date_index (fix_date),
  CONSTRAINT employee_request_timefix_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอแก้ไขเวลาเข้า-ออกงาน';
