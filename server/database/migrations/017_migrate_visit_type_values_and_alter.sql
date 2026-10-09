-- 017: Migrate legacy visit_type values to new enum keys and alter column to new enum
-- Run on a backup or dev DB first. Steps:
-- 1) convert legacy values
-- 2) alter column type to the new enum values

START TRANSACTION;

-- Map legacy values to new values
UPDATE surveys SET visit_type = 'survey_by_sale' WHERE visit_type = 'contact_new';
UPDATE surveys SET visit_type = 'survey_by_sale_service' WHERE visit_type = 'ref_doc';

-- Optional: set NULLs to default if desired (skip if you want to allow NULL)
-- UPDATE surveys SET visit_type = NULL WHERE visit_type = '';

-- Alter column to the new enum definition
ALTER TABLE surveys
  MODIFY COLUMN visit_type ENUM('survey_by_sale','survey_by_sale_service') NULL COMMENT 'ประเภทการเยี่ยม: Survey by Sale / Survey by Sale + Service';

COMMIT;
