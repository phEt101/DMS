-- =====================================================================
-- Leave policy + Documents (ใบลา / OT / แก้เวลา / WFH / ออกนอกสถานที่ / สลับวันหยุด)
-- รองรับ MySQL 5.6+ · CHECK ถูกบังคับใช้ใน MySQL 8.0.16+ เท่านั้น
-- สำหรับ MySQL 5.6 เงื่อนไขเดียวกันต้องตรวจที่ API (MySQL จะ parse แต่ไม่ enforce CHECK)
-- หมายเหตุ: ชื่อตารางใช้ employee_requests / employee_request_* ให้ตรงกับโค้ด API
-- (server/src/features/employee requests/*) — ห้ามเปลี่ยนชื่อฝั่งเดียว
-- ปีนโยบายเก็บเป็น พ.ศ. (เช่น 2569) ตามที่ UI ใช้ ส่วนวันที่ทั้งหมดเก็บเป็น ค.ศ. (DATE)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) นโยบายการลา (1 แถว = 1 ปีนโยบายของบริษัท) แทน INITIAL_POLICY / MockPolicy
-- ---------------------------------------------------------------------
-- (สร้างด้วยชื่อตาราง leave_policies เหมือนเดิม)
CREATE TABLE IF NOT EXISTS leave_policies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสนโยบาย',
  company_id BIGINT UNSIGNED NOT NULL COMMENT 'บริษัทเจ้าของนโยบาย',
  policy_year SMALLINT UNSIGNED NOT NULL COMMENT 'ปีนโยบาย (พ.ศ.)',
  year_start DATE NOT NULL COMMENT 'วันเริ่มต้นปีการลา',
  year_end DATE NOT NULL COMMENT 'วันสิ้นสุดปีการลา (ใช้แสดงวันหมดอายุสิทธิ์)',
  lead_days_personal SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'ลากิจ/ลากิจไม่รับค่าจ้าง: ล่วงหน้าอย่างน้อย (วัน)',
  lead_workdays_vacation SMALLINT UNSIGNED NOT NULL DEFAULT 15 COMMENT 'ลาพักร้อน: ล่วงหน้าอย่างน้อย (วันทำงาน)',
  hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00 COMMENT 'ชั่วโมงต่อ 1 วันทำงาน',
  hour_step DECIMAL(4,2) NOT NULL DEFAULT 1.00 COMMENT 'หน่วยขั้นต่ำของการลาเป็นชั่วโมง',
  certificate_days DECIMAL(4,1) NOT NULL DEFAULT 3.0 COMMENT 'ลาป่วยตั้งแต่กี่วันต้องแนบใบรับรองแพทย์',
  ot_max_hours DECIMAL(4,2) NOT NULL DEFAULT 4.00 COMMENT 'OT สูงสุดต่อใบ (ชั่วโมง)',
  timefix_max_days_back SMALLINT UNSIGNED NOT NULL DEFAULT 7 COMMENT 'ขอแก้เวลาย้อนหลังได้ไม่เกิน (วัน)',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '1=ปีนโยบายที่ใช้งาน',
  updated_by BIGINT UNSIGNED NULL COMMENT 'ผู้แก้ไขล่าสุด',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY leave_policies_company_year_unique (company_id, policy_year),
  KEY leave_policies_company_active_index (company_id, is_active),
  CONSTRAINT leave_policies_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT leave_policies_year_range_chk CHECK (year_end >= year_start),
  CONSTRAINT leave_policies_hours_chk CHECK (hours_per_day > 0 AND hour_step > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='นโยบายการลาและเงื่อนไขการยื่นเอกสารรายปี';

-- ---------------------------------------------------------------------
-- 2) ประเภทการลา (แทน LEAVE_TYPES) + ตัดสิทธิ์จากโควตาไหน
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL COMMENT 'personal, sick, vacation, emergency, ...',
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  balance_bucket ENUM('sick','personal','vacation','other','none') NOT NULL DEFAULT 'none'
    COMMENT 'ตัดจากโควตาใน employees: sick/personal/vacation/other; none=ไม่ตัดโควตา',
  allow_by_hour BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'ลาเป็นชั่วโมงได้ (ลาพักร้อนฉุกเฉิน)',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY leave_types_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประเภทการลา';

INSERT INTO leave_types (code, name_th, name_en, balance_bucket, allow_by_hour, sort_order) VALUES
  ('personal',  'ลากิจ',                 'Personal leave',        'personal', FALSE, 1),
  ('sick',      'ลาป่วย',                'Sick leave',            'sick',     FALSE, 2),
  ('vacation',  'ลาพักร้อน',             'Vacation leave',        'vacation', FALSE, 3),
  ('emergency', 'ลาพักร้อนฉุกเฉิน',      'Emergency vacation',    'vacation', TRUE,  4),
  ('unpaid',    'ลากิจไม่รับค่าจ้าง',    'Unpaid personal leave', 'none',     FALSE, 5),
  ('maternity', 'ลาคลอด',                'Maternity leave',       'none',     FALSE, 6),
  ('ordain',    'ลาบวช',                 'Ordination leave',      'none',     FALSE, 7),
  ('marriage',  'ลาสมรส',                'Marriage leave',        'none',     FALSE, 8),
  ('other',     'ลาอื่น ๆ',              'Other leave',           'other',    FALSE, 9)
ON DUPLICATE KEY UPDATE name_th = VALUES(name_th), name_en = VALUES(name_en);

-- ---------------------------------------------------------------------
-- 3) ตัวนับเลขที่เอกสาร (LV-2569-0012, OT-2569-0008, ...)
--    ใช้ INSERT ... ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1) ใน transaction
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_request_sequences (
  company_id BIGINT UNSIGNED NOT NULL,
  prefix VARCHAR(10) NOT NULL COMMENT 'LV, OT, TF, WFH, OUT, SW',
  policy_year SMALLINT UNSIGNED NOT NULL COMMENT 'ปี พ.ศ.',
  last_no INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, prefix, policy_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ตัวนับเลขที่เอกสารรายบริษัท/ประเภท/ปี';

-- ---------------------------------------------------------------------
-- 4) เอกสารหลัก (ทุกประเภท) แทน MockDocument
--    title/summary ไม่เก็บ — ให้ฝั่ง API/ฟรอนต์สร้างจากข้อมูลตามภาษาที่เลือก
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  request_no VARCHAR(30) NOT NULL COMMENT 'เลขที่เอกสาร เช่น LV-2569-0012',
  kind ENUM('leave','ot','timefix','wfh','outing','swap') NOT NULL COMMENT 'ประเภทเอกสาร',
  employee_user_id BIGINT UNSIGNED NOT NULL COMMENT 'ผู้ยื่น',
  department_id BIGINT UNSIGNED NULL COMMENT 'แผนกของผู้ยื่น ณ วันที่ยื่น (snapshot)',
  manager_user_id BIGINT UNSIGNED NULL COMMENT 'ผู้จัดการที่ต้องอนุมัติ ณ วันที่ยื่น (snapshot)',
  policy_id BIGINT UNSIGNED NULL COMMENT 'นโยบายที่ใช้ตรวจตอนยื่น',
  status ENUM('pending_mgr','pending_hr','approved','rejected','cancelled') NOT NULL DEFAULT 'pending_mgr',
  start_date DATE NULL COMMENT 'วันเริ่มต้น (ลา/WFH/วันที่เกี่ยวข้อง)',
  end_date DATE NULL COMMENT 'วันสิ้นสุด',
  days DECIMAL(6,2) NULL COMMENT 'จำนวนวันทำงาน (ลา/WFH)',
  reason TEXT NULL COMMENT 'เหตุผล/รายละเอียดหลัก',
  rejected_stage ENUM('manager','hr') NULL COMMENT 'ขั้นที่ปฏิเสธ',
  rejection_note TEXT NULL COMMENT 'เหตุผลที่ไม่อนุมัติ',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP NULL COMMENT 'เวลาอนุมัติ/ไม่อนุมัติขั้นสุดท้าย',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employee_requests_company_no_unique (company_id, request_no),
  KEY employee_requests_employee_status_index (employee_user_id, status),
  KEY employee_requests_status_index (status),
  KEY employee_requests_kind_index (kind),
  KEY employee_requests_department_index (department_id),
  KEY employee_requests_manager_status_index (manager_user_id, status),
  KEY employee_requests_dates_index (employee_user_id, start_date, end_date),
  CONSTRAINT employee_requests_employee_fk FOREIGN KEY (employee_user_id) REFERENCES users (id),
  CONSTRAINT employee_requests_department_fk FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT employee_requests_manager_fk FOREIGN KEY (manager_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT employee_requests_policy_fk FOREIGN KEY (policy_id) REFERENCES leave_policies (id) ON DELETE SET NULL,
  CONSTRAINT employee_requests_date_range_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='เอกสารคำขอทั้งหมด (ใบลา, OT, แก้เวลา, WFH, ออกนอกสถานที่, สลับวันหยุด)';

-- ---------------------------------------------------------------------
-- 5) รายละเอียดเฉพาะแต่ละประเภท (1:1 กับ employee_requests)
-- ---------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS employee_request_wfh_details (
  request_id BIGINT UNSIGNED NOT NULL,
  place VARCHAR(255) NOT NULL COMMENT 'สถานที่ทำงาน',
  plan TEXT NOT NULL COMMENT 'แผนงานที่จะทำ',
  PRIMARY KEY (request_id),
  CONSTRAINT employee_request_wfh_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอทำงานนอกสถานที่/WFH (วันที่-จำนวนวันอยู่ใน employee_requests)';

CREATE TABLE IF NOT EXISTS employee_request_outing_details (
  request_id BIGINT UNSIGNED NOT NULL,
  outing_date DATE NOT NULL,
  out_time TIME NOT NULL,
  back_time TIME NULL COMMENT 'เวลากลับโดยประมาณ',
  place VARCHAR(255) NOT NULL,
  PRIMARY KEY (request_id),
  KEY employee_request_outing_date_index (outing_date),
  CONSTRAINT employee_request_outing_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอออกนอกสถานที่ (วัตถุประสงค์อยู่ใน employee_requests.reason)';

CREATE TABLE IF NOT EXISTS employee_request_swap_details (
  request_id BIGINT UNSIGNED NOT NULL,
  off_date DATE NOT NULL COMMENT 'วันที่ขอหยุด',
  work_date DATE NOT NULL COMMENT 'วันที่มาทำงานแทน',
  PRIMARY KEY (request_id),
  CONSTRAINT employee_request_swap_req_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE,
  CONSTRAINT employee_request_swap_dates_chk CHECK (off_date <> work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดขอสลับวันหยุด/วันทำงาน';

-- ---------------------------------------------------------------------
-- 6) ลายเซ็น/การอนุมัติแต่ละขั้น แทน MockDocument.signatures
--    1 เอกสาร = 1 แถวต่อ stage (ผู้ยื่น / ผู้จัดการ / HR)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_request_signatures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  stage ENUM('submitter','manager','hr') NOT NULL,
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

-- ลายเซ็นที่บันทึกไว้ใช้ซ้ำ (ช่อง "จดจำลายเซ็น") แทน savedSignature ใน localStorage
CREATE TABLE IF NOT EXISTS user_saved_signatures (
  user_id BIGINT UNSIGNED NOT NULL,
  signature_image MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT user_saved_signatures_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ลายเซ็นล่าสุดที่ผู้ใช้เลือกจดจำ';

-- ---------------------------------------------------------------------
-- 7) การแจ้งเตือน แทน MockNotification
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 8) View: การใช้สิทธิ์ลาแยกตามโควตา (ใช้ทั้งหน้า ledger และตรวจยอดคงเหลือตอนยื่น)
--    used_approved = อนุมัติแล้ว (ledger) · used_reserved = รวมที่ยังรออนุมัติ (ตรวจยอดตอนยื่น)
--    ขอบเขตปี: ใช้ start_date อยู่ในช่วง leave_policies.year_start..year_end ตอน query
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_leave_usage AS
SELECT
  d.employee_user_id,
  d.start_date,
  lt.code AS leave_type_code,
  lt.balance_bucket,
  CASE WHEN d.status = 'approved' THEN COALESCE(d.days, 0) ELSE 0 END AS used_approved,
  CASE WHEN d.status IN ('pending_mgr','pending_hr','approved') THEN COALESCE(d.days, 0) ELSE 0 END AS used_reserved
FROM employee_requests d
JOIN employee_request_leave_details dl ON dl.request_id = d.id
JOIN leave_types lt ON lt.id = dl.leave_type_id
WHERE d.kind = 'leave';

-- ---------------------------------------------------------------------
-- ตัวอย่าง seed นโยบายปี 2569 (บริษัท Boswell = id 1 จาก migration 018)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO leave_policies (company_id, policy_year, year_start, year_end)
VALUES (1, 2569, '2025-11-26', '2026-11-25');

-- ---------------------------------------------------------------------
-- สิทธิ์ที่ API เอกสารใช้ (ยื่น / พิจารณา / จัดการนโยบายการลา)
-- โมดูล 'documents' ถูก seed โดย database/seeders/010_document_permissions.ts
-- ---------------------------------------------------------------------
INSERT INTO permissions (name, module_id)
SELECT perms.permission_name, permission_modules.id
FROM permission_modules
CROSS JOIN (
  SELECT 'ยื่นเอกสาร' AS permission_name
  UNION ALL SELECT 'พิจารณาเอกสาร'
  UNION ALL SELECT 'จัดการนโยบายการลา'
) AS perms
WHERE permission_modules.name = 'documents' AND permission_modules.deleted_at IS NULL
ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin'
  AND permissions.name IN ('เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร', 'พิจารณาเอกสาร', 'จัดการนโยบายการลา')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name IN ('executive', 'manager', 'user')
  AND permissions.name IN ('เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;
