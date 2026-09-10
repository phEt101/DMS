CREATE TABLE IF NOT EXISTS documents_pm_detail (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสใบงาน PM',
  pm_project_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสโครงการ PM ที่เป็นเจ้าของใบงาน',
  work_order_no VARCHAR(100) NULL COMMENT 'เลขที่ใบงานที่ใช้แสดงและอ้างอิงภายในบริษัท; NULL=ยังไม่กำหนด',
  equipment_name VARCHAR(255) NULL COMMENT 'ชื่ออุปกรณ์ / เครื่องจักรที่ตรวจสอบ เช่น เครื่องทำความเย็น Chiller 100 RT',
  equipment_model VARCHAR(200) NULL COMMENT 'รุ่น / Model ของอุปกรณ์ เช่น Carrier 30XA100',
  equipment_location VARCHAR(300) NULL COMMENT 'ตำแหน่งของอุปกรณ์ภายในสถานที่ เช่น ห้องเครื่องชั้นใต้ดิน 1',
  remarks TEXT NULL COMMENT 'บันทึก / หมายเหตุทั่วไป (อาการเบื้องต้นที่ลูกค้าแจ้ง, สภาพแวดล้อม ฯลฯ)',
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' COMMENT 'ระดับความสำคัญของใบงานรายครั้ง',
  work_order_status ENUM('scheduled','in_progress','waiting_parts','completed','cancelled','on_hold') NOT NULL DEFAULT 'scheduled' COMMENT 'สถานะ: scheduled=รอ, in_progress=ทำงาน, waiting_parts=รออะไหล่, completed=เสร็จ, cancelled=ยกเลิก, on_hold=พัก',
  operator_1_id BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ดำเนินการคนที่ 1; NULL=ยังไม่กำหนด',
  operator_2_id BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ดำเนินการคนที่ 2; NULL=ยังไม่กำหนด',
  operator_3_id BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ดำเนินการคนที่ 3; NULL=ยังไม่กำหนด',
  work_started_at DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มงานจริง',
  work_completed_at DATETIME NULL COMMENT 'วันที่และเวลาที่เสร็จงานจริง',
  duration_minutes INT UNSIGNED NULL COMMENT 'ระยะเวลาทำงานเป็นนาที คำนวณจากเวลาเริ่มและเวลาสิ้นสุดโดย trigger',
  sw_1_before_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปซอฟต์แวร์ชุดที่ 1 ก่อนดำเนินงาน',
  sw_1_after_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปซอฟต์แวร์ชุดที่ 1 หลังดำเนินงาน',
  sw_2_before_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปซอฟต์แวร์ชุดที่ 2 ก่อนดำเนินงาน',
  sw_2_after_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปซอฟต์แวร์ชุดที่ 2 หลังดำเนินงาน',
  hw_1_before_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปฮาร์ดแวร์ชุดที่ 1 ก่อนดำเนินงาน',
  hw_1_after_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปฮาร์ดแวร์ชุดที่ 1 หลังดำเนินงาน',
  hw_2_before_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปฮาร์ดแวร์ชุดที่ 2 ก่อนดำเนินงาน',
  hw_2_after_upload_id BIGINT UNSIGNED NULL COMMENT 'รหัสรูปฮาร์ดแวร์ชุดที่ 2 หลังดำเนินงาน',
  created_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่สร้างใบงาน',
  updated_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่แก้ไขใบงานล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ลบใบงาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'สถานะลบแบบ soft delete: 0=ใช้งาน, 1=ลบแล้ว',
  PRIMARY KEY (id),
  UNIQUE KEY documents_pm_detail_work_order_no_is_deleted_unique (work_order_no, is_deleted),
  KEY documents_pm_detail_pm_project_id_index (pm_project_id),
  KEY documents_pm_detail_priority_index (priority),
  KEY documents_pm_detail_work_order_status_index (work_order_status),
  KEY documents_pm_detail_work_started_at_index (work_started_at),
  KEY documents_pm_detail_operator_1_id_index (operator_1_id),
  KEY documents_pm_detail_operator_2_id_index (operator_2_id),
  KEY documents_pm_detail_operator_3_id_index (operator_3_id),
  KEY documents_pm_detail_duration_minutes_index (duration_minutes),
  KEY documents_pm_detail_is_deleted_index (is_deleted),
  KEY documents_pm_detail_deleted_at_index (deleted_at),
  CONSTRAINT documents_pm_detail_pm_project_fk FOREIGN KEY (pm_project_id)
    REFERENCES documents_pm_projects (id) ON DELETE CASCADE,
  CONSTRAINT documents_pm_detail_operator_1_fk FOREIGN KEY (operator_1_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_operator_2_fk FOREIGN KEY (operator_2_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_operator_3_fk FOREIGN KEY (operator_3_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_sw_1_before_upload_fk FOREIGN KEY (sw_1_before_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_sw_1_after_upload_fk FOREIGN KEY (sw_1_after_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_sw_2_before_upload_fk FOREIGN KEY (sw_2_before_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_sw_2_after_upload_fk FOREIGN KEY (sw_2_after_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_hw_1_before_upload_fk FOREIGN KEY (hw_1_before_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_hw_1_after_upload_fk FOREIGN KEY (hw_1_after_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_hw_2_before_upload_fk FOREIGN KEY (hw_2_before_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_hw_2_after_upload_fk FOREIGN KEY (hw_2_after_upload_id) REFERENCES document_uploads (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ใบงานแต่ละครั้งภายใต้โครงการ PM';

-- คำนวณระยะเวลาทำงานก่อนเพิ่มข้อมูล
CREATE TRIGGER documents_pm_detail_duration_insert BEFORE INSERT ON documents_pm_detail
FOR EACH ROW
  SET NEW.duration_minutes = IFNULL(TIMESTAMPDIFF(MINUTE, NEW.work_started_at, NEW.work_completed_at), NULL);

-- คำนวณระยะเวลาทำงานใหม่ก่อนแก้ไขข้อมูล
CREATE TRIGGER documents_pm_detail_duration_update BEFORE UPDATE ON documents_pm_detail
FOR EACH ROW
  SET NEW.duration_minutes = IFNULL(TIMESTAMPDIFF(MINUTE, NEW.work_started_at, NEW.work_completed_at), NULL);
