-- เพิ่มขั้นอนุมัติผู้ประกอบการ (executive) ใน flow เอกสารพนักงาน
-- Flow ใหม่:
--   user (พนักงาน)      : manager -> HR
--   manager             : executive -> HR
--   HR                  : executive -> HR คนอื่น (ไม่ใช่ผู้ยื่นเอง)
--   executive           : HR
-- สถานะ pending_exec = รอผู้ประกอบการ (executive) อนุมัติ

SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND column_name = 'executive_user_id') = 0,
  'ALTER TABLE employee_requests ADD COLUMN executive_user_id BIGINT UNSIGNED NULL COMMENT ''ผู้ประกอบการที่ต้องอนุมัติ (snapshot ณ วันที่เข้าสู่ขั้น executive)'' AFTER manager_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND index_name = 'employee_requests_executive_status_index') = 0,
  'ALTER TABLE employee_requests ADD KEY employee_requests_executive_status_index (executive_user_id, status)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND index_name = 'employee_requests_executive_fk') = 0,
  'ALTER TABLE employee_requests ADD CONSTRAINT employee_requests_executive_fk FOREIGN KEY (executive_user_id) REFERENCES users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- เพิ่ม pending_exec ใน enum สถานะ
SET @enum_check = (
  SELECT IF(COLUMN_TYPE LIKE '%pending_exec%', 0, 1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND column_name = 'status'
);
SET @ddl = IF(@enum_check = 1,
  'ALTER TABLE employee_requests MODIFY COLUMN status ENUM(''pending_mgr'',''pending_exec'',''pending_hr'',''approved'',''rejected'',''cancelled'') NOT NULL DEFAULT ''pending_mgr'' COMMENT ''pending_mgr=รอผู้จัดการแผนก, pending_exec=รอผู้ประกอบการ, pending_hr=รอHR''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- เพิ่มขั้นลายเซ็น executive
SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'employee_request_signatures' AND column_type LIKE '%executive%') = 0,
  'ALTER TABLE employee_request_signatures MODIFY COLUMN stage ENUM(''submitter'',''manager'',''executive'',''hr'') NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND column_name = 'rejected_stage' AND column_type LIKE '%executive%') = 0,
  'ALTER TABLE employee_requests MODIFY COLUMN rejected_stage ENUM(''manager'',''executive'',''hr'') NULL COMMENT ''ขั้นที่ปฏิเสธ''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ทิศทางการรอ: pending_exec ต้องมี executive_user_id ตั้งแต่ยื่น (ผู้ยื่นเป็น manager/HR/executive อาจไม่มี manager)
SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'employee_requests' AND column_name = 'route_to') = 0,
  'ALTER TABLE employee_requests ADD COLUMN route_to VARCHAR(20) NULL COMMENT ''สถานะขั้นที่กำลังรอ (mgr/exec/hr) ตาม flow ของ role ผู้ยื่น'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
