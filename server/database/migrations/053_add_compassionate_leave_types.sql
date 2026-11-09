INSERT INTO leave_types (code, name_th, name_en, balance_bucket, allow_by_hour, sort_order)
VALUES
  ('compassionate_employee_family', 'ลาเมตตาจิต (คู่สมรส บุตร หรือบิดามารดาของพนักงาน)', 'Compassionate leave (employee spouse, child, or parent)', 'none', 0, 10),
  ('compassionate_spouse_parent', 'ลาเมตตาจิต (บิดามารดาของคู่สมรส)', 'Compassionate leave (parent of spouse)', 'none', 0, 11)
ON DUPLICATE KEY UPDATE
  name_th = VALUES(name_th),
  name_en = VALUES(name_en),
  balance_bucket = VALUES(balance_bucket),
  allow_by_hour = VALUES(allow_by_hour),
  sort_order = VALUES(sort_order),
  is_active = 1;
