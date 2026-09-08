CREATE TABLE IF NOT EXISTS documents_pm_detail (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสใบงานรายครั้ง (PK L3)',
  pm_project_id BIGINT UNSIGNED NOT NULL COMMENT 'FK L2 documents_pm_projects.id (โปรเจกต์แม่ของใบงานนี้ — 1 L2 มีได้หลาย L3 ใบงาน)',
  work_order_no VARCHAR(100) NOT NULL COMMENT 'เลขที่ใบงาน เช่น WO-SVV-256909-001 (human-readable ใช้อ้างอิงภายในบริษัท)',
  equipment_name VARCHAR(255) NULL COMMENT 'ชื่ออุปกรณ์ / เครื่องจักรที่ตรวจสอบ เช่น เครื่องทำความเย็น Chiller 100 RT',
  equipment_model VARCHAR(200) NULL COMMENT 'รุ่น / Model ของอุปกรณ์ เช่น Carrier 30XA100',
  equipment_location VARCHAR(300) NULL COMMENT 'ตำแหน่งของอุปกรณ์ภายในสถานที่ เช่น ห้องเครื่องชั้นใต้ดิน 1',
  remarks TEXT NULL COMMENT 'บันทึก / หมายเหตุทั่วไป (อาการเบื้องต้นที่ลูกค้าแจ้ง, สภาพแวดล้อม ฯลฯ)',
  work_order_status ENUM('scheduled','in_progress','waiting_parts','completed','cancelled','on_hold') NOT NULL DEFAULT 'scheduled' COMMENT 'สถานะใบงานรายครั้ง: scheduled=วางแปร, in_progress=กำลังทำ, waiting_parts=รออะไหล่, completed=เสร็จ, cancelled=ยกเลิก, on_hold=ระงับชั่วคราว',
  operator_1_id BIGINT UNSIGNED NULL COMMENT 'FK users.id — ผู้ดำเนินการคนที่ 1 (ห้าม NULL บังคับกรอก)',
  operator_2_id BIGINT UNSIGNED NULL COMMENT 'FK users.id — ผู้ดำเนินการคนที่ 2 (เว้นได้)',
  operator_3_id BIGINT UNSIGNED NULL COMMENT 'FK users.id — ผู้ดำเนินการคนที่ 3 (เว้นได้ สูงสุด 3 คน)',
  work_started_at DATETIME NULL COMMENT 'เวลาเริ่มงานจริง (Timestamp ไม่ใช่แค่วัน)',
  work_completed_at DATETIME NULL COMMENT 'เวลาเสร็จงานจริง (Timestamp ไม่ใช่แค่วัน)',
  duration_minutes INT UNSIGNED NULL COMMENT 'DBA Auto-Calc ระยะเวลาทำงาน (นาที) work_completed_at - work_started_at; แทน MySQL GENERATED COLUMN (ไม่รองรับ MySQL 5.6) → ใช้ 2 Trigger BEFORE INSERT/UPDATE คำนวณ Auto ใน DB Level; ปล่อย NULL เอง ถ้า work_started หรือ work_completed ยังไม่กรอก; ห้าม Backend คิดเองหรือส่งค่ามา — Trigger Sync 100%',
  sw_1_before_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพอุปกรณ์/หน้าจอ Software ชุดที่ 1 ก่อนการแก้ไข',
  sw_1_after_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Software ชุดที่ 1 หลังการแก้ไข',
  sw_2_before_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Software ชุดที่ 2 ก่อนการแก้ไข (ซ้ำ 2 ชุดตามรูปใบงาน Airport)',
  sw_2_after_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Software ชุดที่ 2 หลังการแก้ไข',
  hw_1_before_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Hardware (ร่างกายเครื่อง) ชุดที่ 1 ก่อนการแก้ไข',
  hw_1_after_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Hardware ชุดที่ 1 หลังการแก้ไข',
  hw_2_before_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Hardware ชุดที่ 2 ก่อนการแก้ไข',
  hw_2_after_upload_id BIGINT UNSIGNED NULL COMMENT 'FK L5 document_uploads.id — รูปภาพ Hardware ชุดที่ 2 หลังการแก้ไข',
  created_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครสร้างใบงานนี้',
  updated_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครแก้ไขใบงานล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'FK users.id — ใครลบใบงานนี้',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'สร้างเมื่อ',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'Soft Delete เวลาที่ลบ (NULL=ยังใช้งาน)',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'DBA Flag Soft Delete ควบคุม UNIQUE work_order_no Composite แก้ MySQL NULL!=NULL Bug',
  PRIMARY KEY (id),
  UNIQUE KEY documents_pm_detail_work_order_no_is_deleted_unique (work_order_no, is_deleted),
  KEY documents_pm_detail_pm_project_id_index (pm_project_id),
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
COMMENT='L3 ระดับใบงานรายครั้ง (Work Order) ของ PM; จำกัดผู้ดำเนินการสูงสุด 3 คน (operator 1-3); DBA duration_minutes = 2 BEFORE Trigger BEFORE INSERT/UPDATE Auto-Calc TIMESTAMPDIFF (MySQL 5.6 Compatible ไม่มี Generated Column); 8 FK id_upload 8 รูปภาพ (SW×2 ก่อน-หลัง + HW×2 ก่อน-หลัง = 8 ช่อง) ทั้งหมด FK L5 document_uploads.id ON DELETE SET NULL; is_deleted TINYINT(1) + UNIQUE(work_order_no,is_deleted)';

-- ⭐️ DBA: duration_minutes Auto-Calc (แทน MySQL 5.7+ GENERATED COLUMN ที่ 5.6 ไม่รองรับ)
-- Trigger BEFORE INSERT: Auto คำนวณ duration_minutes ก่อน Insert ทุกครั้ง (ห้าม Backend ส่งค่ามาเอง!)
CREATE TRIGGER documents_pm_detail_duration_insert BEFORE INSERT ON documents_pm_detail
FOR EACH ROW
  SET NEW.duration_minutes = IFNULL(TIMESTAMPDIFF(MINUTE, NEW.work_started_at, NEW.work_completed_at), NULL);

-- Trigger BEFORE UPDATE: Auto คำนวณใหม่ทุกครั้ง เมื่อแก้ไข work_started_at หรือ work_completed_at
CREATE TRIGGER documents_pm_detail_duration_update BEFORE UPDATE ON documents_pm_detail
FOR EACH ROW
  SET NEW.duration_minutes = IFNULL(TIMESTAMPDIFF(MINUTE, NEW.work_started_at, NEW.work_completed_at), NULL);
