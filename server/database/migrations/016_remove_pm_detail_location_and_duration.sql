DROP TRIGGER IF EXISTS documents_pm_detail_duration_insert;
DROP TRIGGER IF EXISTS documents_pm_detail_duration_update;

ALTER TABLE documents_pm_detail
  DROP INDEX documents_pm_detail_duration_minutes_index,
  DROP COLUMN equipment_location,
  DROP COLUMN duration_minutes;
