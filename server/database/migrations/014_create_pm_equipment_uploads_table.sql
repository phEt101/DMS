CREATE TABLE IF NOT EXISTS pm_equipment_uploads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสไฟล์แนบของอุปกรณ์ PM',
  pm_equipment_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสอุปกรณ์ PM ที่เป็นเจ้าของไฟล์',
  image_phase ENUM('reference','before','after') NOT NULL COMMENT 'ประเภทภาพ: reference=ภาพอุปกรณ์หรือจุดติดตั้ง, before=ก่อนดำเนินงาน, after=หลังดำเนินงาน',
  sort_order TINYINT UNSIGNED NOT NULL COMMENT 'ลำดับรูปภายในช่วง ตั้งแต่ 1 ถึง 4',
  stored_name VARCHAR(191) NOT NULL COMMENT 'ชื่อไฟล์ที่ใช้จัดเก็บภายในระบบ',
  original_name VARCHAR(255) NOT NULL COMMENT 'ชื่อเดิมของไฟล์ตอนอัปโหลด',
  mime_type VARCHAR(100) NOT NULL COMMENT 'MIME Type ของไฟล์ เช่น image/jpeg หรือ image/png',
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ขนาดไฟล์ หน่วย Byte',
  file_hash CHAR(64) NULL COMMENT 'ค่า SHA-256 สำหรับตรวจสอบความถูกต้องของไฟล์',
  storage_driver VARCHAR(50) NOT NULL DEFAULT 'local_disk' COMMENT 'ระบบจัดเก็บไฟล์ เช่น local_disk, s3 หรือ google_cloud',
  storage_path VARCHAR(500) NOT NULL COMMENT 'พาธแบบ relative หรือ object key ที่ใช้ค้นหาไฟล์ใน storage',
  upload_note VARCHAR(255) NULL COMMENT 'หมายเหตุเพิ่มเติมของไฟล์',
  uploaded_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่อัปโหลดไฟล์',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่อัปโหลด',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขข้อมูลไฟล์ล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ลบไฟล์',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'สถานะลบแบบ soft delete: 0=ใช้งาน, 1=ลบแล้ว',
  active_sort_order TINYINT UNSIGNED NULL COMMENT 'ลำดับของไฟล์ที่ยังใช้งาน; trigger กำหนดเป็น NULL เมื่อถูกลบเพื่อให้เพิ่มลำดับเดิมซ้ำได้',
  PRIMARY KEY (id),
  CONSTRAINT pm_equipment_uploads_sort_order_check CHECK (sort_order BETWEEN 1 AND 4),
  UNIQUE KEY pm_equipment_uploads_active_slot_unique (pm_equipment_id, image_phase, active_sort_order),
  KEY pm_equipment_uploads_pm_equipment_id_index (pm_equipment_id),
  KEY pm_equipment_uploads_phase_index (image_phase),
  KEY pm_equipment_uploads_uploaded_by_index (uploaded_by),
  KEY pm_equipment_uploads_is_deleted_index (is_deleted),
  KEY pm_equipment_uploads_deleted_at_index (deleted_at),
  CONSTRAINT pm_equipment_uploads_equipment_fk FOREIGN KEY (pm_equipment_id)
    REFERENCES pm_equipment (id) ON DELETE CASCADE,
  CONSTRAINT pm_equipment_uploads_uploaded_by_fk FOREIGN KEY (uploaded_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT pm_equipment_uploads_deleted_by_fk FOREIGN KEY (deleted_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='รูปภาพก่อนและหลังดำเนินงานของอุปกรณ์ในโครงการ PM';

-- MySQL 5.6 ยังไม่มี generated column จึงให้ trigger ดูแลคีย์เฉพาะของไฟล์ที่ใช้งานแทน
CREATE TRIGGER pm_equipment_uploads_active_slot_insert
BEFORE INSERT ON pm_equipment_uploads
FOR EACH ROW
  SET NEW.active_sort_order = IF(NEW.is_deleted = 0, NEW.sort_order, NULL);

CREATE TRIGGER pm_equipment_uploads_active_slot_update
BEFORE UPDATE ON pm_equipment_uploads
FOR EACH ROW
  SET NEW.active_sort_order = IF(NEW.is_deleted = 0, NEW.sort_order, NULL);
