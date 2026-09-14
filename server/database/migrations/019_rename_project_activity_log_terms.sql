UPDATE activity_logs
SET module = 'projects'
WHERE module = 'documents';

UPDATE activity_logs
SET entity_type = CASE entity_type
  WHEN 'document' THEN 'project'
  WHEN 'documents_pm_detail' THEN 'pm_equipment'
  WHEN 'documents_pm_detail_upload' THEN 'pm_equipment_upload'
  ELSE entity_type
END
WHERE entity_type IN ('document', 'documents_pm_detail', 'documents_pm_detail_upload');
