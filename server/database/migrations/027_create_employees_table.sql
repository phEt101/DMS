CREATE TABLE IF NOT EXISTS employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Employee profile identifier',
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'Linked login account',
  employee_code VARCHAR(50) NULL COMMENT 'Company employee code',
  position VARCHAR(150) NULL COMMENT 'Job title',
  manager_user_id BIGINT UNSIGNED NULL COMMENT 'Approving manager account',
  employment_start_date DATE NULL COMMENT 'First day of employment',
  appointed_date DATE NULL COMMENT 'Appointment date',
  sick_leave_days DECIMAL(7,2) NULL COMMENT 'Annual sick leave entitlement in days',
  personal_leave_days DECIMAL(7,2) NULL COMMENT 'Annual personal leave entitlement in days',
  vacation_leave_days DECIMAL(7,2) NULL COMMENT 'Annual vacation leave entitlement in days',
  other_leave_days DECIMAL(7,2) NULL COMMENT 'Other annual leave entitlement in days',
  email_notifications_enabled BOOLEAN NULL DEFAULT TRUE COMMENT 'Whether employee receives email notifications',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employees_user_id_unique (user_id),
  KEY employees_manager_user_id_index (manager_user_id),
  KEY employees_employee_code_index (employee_code),
  CONSTRAINT employees_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT employees_manager_user_fk FOREIGN KEY (manager_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee details linked one-to-one with user accounts';
