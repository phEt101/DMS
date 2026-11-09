SET @add_emergency_leave_limit = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE leave_policies ADD COLUMN emergency_max_days DECIMAL(5,2) UNSIGNED NOT NULL DEFAULT 3.00 COMMENT ''ลาพักร้อนฉุกเฉิน: จำนวนวันสูงสุดต่อปีนโยบาย''',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'leave_policies'
    AND column_name = 'emergency_max_days'
);

PREPARE add_emergency_leave_limit_stmt FROM @add_emergency_leave_limit;
EXECUTE add_emergency_leave_limit_stmt;
DEALLOCATE PREPARE add_emergency_leave_limit_stmt;
