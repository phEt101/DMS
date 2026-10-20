CREATE TABLE IF NOT EXISTS employee_request_swap_details (
  request_id BIGINT UNSIGNED NOT NULL,
  off_date DATE NOT NULL COMMENT 'วันที่ขอหยุด',
  work_date DATE NOT NULL COMMENT 'วันที่มาทำงานแทน',
  PRIMARY KEY (request_id),
  CONSTRAINT employee_request_swap_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_swap_dates_chk CHECK (off_date <> work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอสลับวันหยุด/วันทำงาน';
