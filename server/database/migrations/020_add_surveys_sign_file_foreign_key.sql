SET @ddl = IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'surveys' AND constraint_name = 'surveys_sign_file_fk') = 0,
  'ALTER TABLE surveys ADD CONSTRAINT surveys_sign_file_fk FOREIGN KEY (sign_file_id) REFERENCES survey_files (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
