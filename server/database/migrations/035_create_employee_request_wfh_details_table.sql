CREATE TABLE IF NOT EXISTS employee_request_wfh_details (
  request_id BIGINT UNSIGNED NOT NULL,
  place VARCHAR(255) NOT NULL COMMENT 'สถานที่ทำงาน',
  plan TEXT NOT NULL COMMENT 'แผนงานที่จะทำ',
  PRIMARY KEY (request_id),
  CONSTRAINT employee_request_wfh_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอทำงานนอกสถานที่/WFH (วันที่-จำนวนวันอยู่ใน employee_requests)';
