CREATE TABLE IF NOT EXISTS employee_request_leave_details (
  request_id BIGINT UNSIGNED NOT NULL,
  leave_type_id BIGINT UNSIGNED NOT NULL,
  by_hour BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'ลาเป็นชั่วโมง (ลาพักร้อนฉุกเฉินเท่านั้น)',
  start_time TIME NULL,
  end_time TIME NULL,
  hours DECIMAL(5,2) NULL COMMENT 'รวมชั่วโมง (กรณีลาเป็นชั่วโมง)',
  has_medical_certificate BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'แนบใบรับรองแพทย์แล้ว',
  PRIMARY KEY (request_id),
  KEY employee_request_leave_type_index (leave_type_id),
  CONSTRAINT employee_request_leave_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_leave_type_fk FOREIGN KEY (leave_type_id) REFERENCES leave_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดใบลา';
