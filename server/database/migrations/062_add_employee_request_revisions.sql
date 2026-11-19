-- การยื่นแก้ไขเอกสารฉบับเดิม (ไม่สร้างเลขที่ใหม่)
-- เอกสารที่ถูกไม่อนุมัติสามารถแก้ไขและยื่นใหม่ได้ โดยคงเลขที่เอกสารและประวัติการพิจารณาเดิมไว้
ALTER TABLE employee_requests
  ADD COLUMN revision_no INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'จำนวนครั้งที่ยื่นแก้ไขเอกสารฉบับนี้ (0 = ยังไม่เคยแก้ไข)' AFTER status,
  ADD COLUMN resubmitted_at TIMESTAMP NULL DEFAULT NULL
    COMMENT 'วันเวลาที่ยื่นฉบับแก้ไขครั้งล่าสุด' AFTER submitted_at,
  ADD COLUMN last_rejected_at TIMESTAMP NULL DEFAULT NULL
    COMMENT 'วันเวลาที่ถูกไม่อนุมัติครั้งล่าสุด (คงไว้หลังยื่นแก้ไข)' AFTER decided_at;

-- เก็บ snapshot ของรอบที่ปิดแล้ว (ถูกไม่อนุมัติ) ก่อนเริ่มรอบใหม่
-- เพื่อให้เหตุผล ผู้พิจารณา และผลอนุมัติของรอบเดิมยังตรวจสอบย้อนหลังได้
CREATE TABLE IF NOT EXISTS employee_request_rounds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL COMMENT 'เอกสารฉบับเดิม',
  round_no INT UNSIGNED NOT NULL COMMENT 'รอบที่ปิดแล้ว (1 = การยื่นครั้งแรก)',
  rejected_stage ENUM('manager','executive','hr') NULL COMMENT 'ขั้นที่ไม่อนุมัติในรอบนั้น',
  rejection_note TEXT NULL COMMENT 'เหตุผลที่ไม่อนุมัติ (ข้อความเดิมของผู้พิจารณา)',
  submitted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'วันเวลาที่ยื่นในรอบนั้น',
  rejected_at TIMESTAMP NULL DEFAULT NULL COMMENT 'วันเวลาที่ไม่อนุมัติ',
  resubmitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันเวลาที่ยื่นฉบับแก้ไขเพื่อเริ่มรอบถัดไป',
  request_snapshot LONGTEXT NULL COMMENT 'ข้อมูลคำขอของรอบเดิม (วันที่ จำนวนวัน เหตุผล และรายละเอียดเฉพาะประเภท)',
  decisions_snapshot LONGTEXT NULL COMMENT 'ผลการพิจารณาของรอบเดิม (ขั้น ผู้พิจารณา ผล หมายเหตุ เวลา)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employee_request_rounds_round_unique (request_id, round_no),
  KEY employee_request_rounds_request_index (request_id),
  CONSTRAINT employee_request_rounds_request_fk FOREIGN KEY (request_id) REFERENCES employee_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ประวัติรอบการพิจารณาที่ปิดแล้วของเอกสารฉบับเดิม ก่อนยื่นแก้ไข';
