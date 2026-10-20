CREATE TABLE IF NOT EXISTS employee_request_signatures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  stage ENUM('submitter','manager','executive','hr') NOT NULL,
  action ENUM('submitted','approved','rejected') NOT NULL,
  signer_user_id BIGINT UNSIGNED NOT NULL,
  signer_name VARCHAR(150) NOT NULL COMMENT 'ชื่อผู้ลงนาม ณ ขณะนั้น (snapshot)',
  signature_image MEDIUMTEXT NULL COMMENT 'ลายเซ็น data URL (PNG base64) หรือ path ในที่เก็บไฟล์; NULL ได้กรณีปฏิเสธโดยไม่เซ็น',
  note TEXT NULL COMMENT 'หมายเหตุ/เหตุผลที่ไม่อนุมัติ',
  signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employee_request_signatures_stage_unique (request_id, stage),
  KEY employee_request_signatures_signer_index (signer_user_id),
  CONSTRAINT employee_request_signatures_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_signatures_user_fk FOREIGN KEY (signer_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ลายเซ็นและผลการอนุมัติของแต่ละขั้นตอน';
