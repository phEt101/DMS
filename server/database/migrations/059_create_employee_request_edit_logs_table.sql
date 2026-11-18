-- บันทึกประวัติการแก้ไขวันลาโดย HR (เช่น เลื่อนวันพักร้อนที่ยื่นไว้แล้ว)
CREATE TABLE IF NOT EXISTS employee_request_edit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL COMMENT 'เอกสารที่ถูกแก้ไข',
  edited_by BIGINT UNSIGNED NOT NULL COMMENT 'HR ผู้แก้ไข',
  old_start_date DATE NULL,
  old_end_date DATE NULL,
  old_days DECIMAL(6,2) NULL,
  new_start_date DATE NULL,
  new_end_date DATE NULL,
  new_days DECIMAL(6,2) NULL,
  note VARCHAR(500) NULL COMMENT 'เหตุผลการแก้ไข (ถ้ามี)',
  edited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employee_request_edit_logs_request_index (request_id),
  CONSTRAINT employee_request_edit_logs_request_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_edit_logs_user_fk FOREIGN KEY (edited_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประวัติการแก้ไขวันลาโดย HR';
