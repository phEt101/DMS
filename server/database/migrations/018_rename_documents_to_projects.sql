DROP TRIGGER IF EXISTS documents_pm_detail_uploads_active_slot_insert;
DROP TRIGGER IF EXISTS documents_pm_detail_uploads_active_slot_update;

RENAME TABLE
  document_types TO project_types,
  documents TO projects,
  documents_pm_projects TO pm_projects,
  documents_pm_detail TO pm_equipment,
  documents_pm_detail_items TO pm_equipment_items,
  documents_pm_detail_uploads TO pm_equipment_uploads;

ALTER TABLE projects
  CHANGE COLUMN document_type_id project_type_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสประเภทโครงการ';

ALTER TABLE pm_projects
  CHANGE COLUMN document_id project_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสโครงการหลัก';

ALTER TABLE pm_equipment_items
  CHANGE COLUMN pm_detail_id pm_equipment_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสอุปกรณ์ PM';

ALTER TABLE pm_equipment_uploads
  CHANGE COLUMN pm_detail_id pm_equipment_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสอุปกรณ์ PM';

CREATE TRIGGER pm_equipment_uploads_active_slot_insert
BEFORE INSERT ON pm_equipment_uploads
FOR EACH ROW
  SET NEW.active_sort_order = IF(NEW.is_deleted = 0, NEW.sort_order, NULL);

CREATE TRIGGER pm_equipment_uploads_active_slot_update
BEFORE UPDATE ON pm_equipment_uploads
FOR EACH ROW
  SET NEW.active_sort_order = IF(NEW.is_deleted = 0, NEW.sort_order, NULL);

UPDATE permission_modules
SET name = 'projects', icon_name = 'FaDiagramProject'
WHERE name = 'documents';

UPDATE permissions
SET name = CASE name
  WHEN 'เข้าถึงเมนูเอกสาร' THEN 'เข้าถึงเมนูโครงการ'
  WHEN 'สร้างเอกสาร' THEN 'สร้างโครงการ'
  WHEN 'แก้ไขเอกสาร' THEN 'แก้ไขโครงการ'
  WHEN 'ลบเอกสาร' THEN 'ลบโครงการ'
  ELSE name
END
WHERE name IN ('เข้าถึงเมนูเอกสาร', 'สร้างเอกสาร', 'แก้ไขเอกสาร', 'ลบเอกสาร');

UPDATE permissions
SET name = 'กู้คืนโครงการ'
WHERE name = 'กู้คืนเอกสาร';
