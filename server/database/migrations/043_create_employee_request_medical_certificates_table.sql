CREATE TABLE IF NOT EXISTS employee_request_medical_certificates (
  request_id BIGINT UNSIGNED NOT NULL,
  stored_name VARCHAR(191) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  file_hash CHAR(64) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY employee_request_medical_certificates_stored_name_unique (stored_name),
  KEY employee_request_medical_certificates_uploaded_by_index (uploaded_by),
  CONSTRAINT employee_request_medical_certificates_request_fk
    FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_medical_certificates_user_fk
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ไฟล์ใบรับรองแพทย์ของใบลา เก็บไฟล์ใน storage และ metadata ในฐานข้อมูล';
