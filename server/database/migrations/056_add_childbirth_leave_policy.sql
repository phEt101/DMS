ALTER TABLE leave_policies
  ADD COLUMN maternity_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 120 COMMENT 'ลาคลอด: จำนวนวันสูงสุดต่อคำขอ',
  ADD COLUMN childcare_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 15 COMMENT 'ลาเลี้ยงดูบุตรต่อเนื่อง: จำนวนวันสูงสุดต่อคำขอ',
  ADD COLUMN childcare_pay_percent TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT 'ลาเลี้ยงดูบุตรต่อเนื่อง: อัตราค่าจ้างเป็นเปอร์เซ็นต์',
  ADD COLUMN spouse_childbirth_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 15 COMMENT 'ลาช่วยเหลือคู่สมรสคลอดบุตร: จำนวนวันสูงสุดต่อคำขอ',
  ADD COLUMN spouse_childbirth_window_days SMALLINT UNSIGNED NOT NULL DEFAULT 90 COMMENT 'ลาช่วยเหลือคู่สมรสคลอดบุตร: จำนวนวันนับจากวันคลอดที่ใช้สิทธิได้';

ALTER TABLE employee_request_leave_details
  ADD COLUMN child_birth_date DATE NULL COMMENT 'วันคลอดบุตร (ใช้ตรวจช่วงสิทธิลาช่วยเหลือคู่สมรสคลอดบุตร)';

INSERT INTO leave_types (code, name_th, name_en, balance_bucket, allow_by_hour, sort_order)
VALUES
  ('childcare_after_maternity', 'ลาต่อเนื่องเพื่อเลี้ยงดูบุตร', 'Continuous childcare leave after maternity leave', 'none', 0, 12),
  ('spouse_childbirth', 'ลาช่วยเหลือคู่สมรสคลอดบุตร', 'Leave to support spouse after childbirth', 'none', 0, 13)
ON DUPLICATE KEY UPDATE
  name_th = VALUES(name_th),
  name_en = VALUES(name_en),
  balance_bucket = VALUES(balance_bucket),
  allow_by_hour = VALUES(allow_by_hour),
  sort_order = VALUES(sort_order),
  is_active = 1;
