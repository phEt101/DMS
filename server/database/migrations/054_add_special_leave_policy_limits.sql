SET @add_ordain_max_days = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN ordain_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 30 COMMENT ''ลาบวช: จำนวนวันสูงสุดต่อคำขอ''',
    'SELECT 1')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leave_policies' AND column_name = 'ordain_max_days'
);
PREPARE add_ordain_max_days_stmt FROM @add_ordain_max_days;
EXECUTE add_ordain_max_days_stmt;
DEALLOCATE PREPARE add_ordain_max_days_stmt;

SET @add_compassionate_employee_max_days = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN compassionate_employee_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 6 COMMENT ''ลาเมตตาจิตครอบครัวพนักงาน: จำนวนวันสูงสุดต่อคำขอ''',
    'SELECT 1')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leave_policies' AND column_name = 'compassionate_employee_max_days'
);
PREPARE add_compassionate_employee_max_days_stmt FROM @add_compassionate_employee_max_days;
EXECUTE add_compassionate_employee_max_days_stmt;
DEALLOCATE PREPARE add_compassionate_employee_max_days_stmt;

SET @add_compassionate_employee_paid_days = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN compassionate_employee_paid_days SMALLINT UNSIGNED NOT NULL DEFAULT 4 COMMENT ''ลาเมตตาจิตครอบครัวพนักงาน: วันได้รับค่าจ้างสูงสุด''',
    'SELECT 1')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leave_policies' AND column_name = 'compassionate_employee_paid_days'
);
PREPARE add_compassionate_employee_paid_days_stmt FROM @add_compassionate_employee_paid_days;
EXECUTE add_compassionate_employee_paid_days_stmt;
DEALLOCATE PREPARE add_compassionate_employee_paid_days_stmt;

SET @add_compassionate_spouse_parent_max_days = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN compassionate_spouse_parent_max_days SMALLINT UNSIGNED NOT NULL DEFAULT 3 COMMENT ''ลาเมตตาจิตบิดามารดาคู่สมรส: จำนวนวันสูงสุดต่อคำขอ''',
    'SELECT 1')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leave_policies' AND column_name = 'compassionate_spouse_parent_max_days'
);
PREPARE add_compassionate_spouse_parent_max_days_stmt FROM @add_compassionate_spouse_parent_max_days;
EXECUTE add_compassionate_spouse_parent_max_days_stmt;
DEALLOCATE PREPARE add_compassionate_spouse_parent_max_days_stmt;

SET @add_compassionate_spouse_parent_paid_days = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN compassionate_spouse_parent_paid_days SMALLINT UNSIGNED NOT NULL DEFAULT 2 COMMENT ''ลาเมตตาจิตบิดามารดาคู่สมรส: วันได้รับค่าจ้างสูงสุด''',
    'SELECT 1')
  FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'leave_policies' AND column_name = 'compassionate_spouse_parent_paid_days'
);
PREPARE add_compassionate_spouse_parent_paid_days_stmt FROM @add_compassionate_spouse_parent_paid_days;
EXECUTE add_compassionate_spouse_parent_paid_days_stmt;
DEALLOCATE PREPARE add_compassionate_spouse_parent_paid_days_stmt;
