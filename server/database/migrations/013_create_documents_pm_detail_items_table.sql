CREATE TABLE IF NOT EXISTS pm_equipment_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายละเอียดงานของอุปกรณ์',
  pm_equipment_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสอุปกรณ์ PM ที่เป็นเจ้าของรายการ',
  section ENUM('cause','action','result') NOT NULL COMMENT 'ส่วนของรายงาน: cause=สาเหตุ, action=วิธีแก้ไข, result=ผลการตรวจ',
  item_no TINYINT UNSIGNED NOT NULL COMMENT 'ลำดับรายการภายในแต่ละ section',
  item_content TEXT NULL COMMENT 'รายละเอียดของรายการ',
  created_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่สร้างรายการ',
  updated_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่แก้ไขรายการล่าสุด',
  deleted_by BIGINT UNSIGNED NULL COMMENT 'รหัสผู้ใช้งานที่ลบรายการ',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้าง',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่แก้ไขล่าสุด',
  deleted_at TIMESTAMP NULL COMMENT 'วันที่และเวลาที่ลบแบบ soft delete; NULL=ยังไม่ถูกลบ',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'สถานะลบแบบ soft delete: 0=ใช้งาน, 1=ลบแล้ว',
  PRIMARY KEY (id),
  UNIQUE KEY pm_equipment_items_per_section_unique (pm_equipment_id, section, item_no, is_deleted),
  KEY pm_equipment_items_pm_equipment_id_index (pm_equipment_id),
  KEY pm_equipment_items_section_index (section),
  KEY pm_equipment_items_item_no_index (item_no),
  KEY pm_equipment_items_is_deleted_index (is_deleted),
  KEY pm_equipment_items_deleted_at_index (deleted_at),
  CONSTRAINT pm_equipment_items_equipment_fk FOREIGN KEY (pm_equipment_id)
    REFERENCES pm_equipment (id) ON DELETE CASCADE,
  CONSTRAINT pm_equipment_items_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT pm_equipment_items_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT pm_equipment_items_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='รายการสาเหตุ วิธีแก้ไข และผลการตรวจของอุปกรณ์ PM';
