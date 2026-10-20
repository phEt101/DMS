CREATE TABLE IF NOT EXISTS employee_request_ot_details (
  request_id BIGINT UNSIGNED NOT NULL,
  day_type ENUM('weekday','weekend','holiday') NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  task VARCHAR(255) NOT NULL COMMENT 'งาน/โครงการที่ทำ',
  PRIMARY KEY (request_id),
  KEY employee_request_ot_work_date_index (work_date),
  CONSTRAINT employee_request_ot_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_ot_time_chk CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอ OT';
