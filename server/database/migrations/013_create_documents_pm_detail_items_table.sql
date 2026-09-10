CREATE TABLE IF NOT EXISTS documents_pm_detail_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการย่อยของใบงาน',
  pm_detail_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสใบงาน PM ที่เป็นเจ้าของรายการ',
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
  UNIQUE KEY documents_pm_detail_items_per_section_unique (pm_detail_id, section, item_no, is_deleted),
  KEY documents_pm_detail_items_pm_detail_id_index (pm_detail_id),
  KEY documents_pm_detail_items_section_index (section),
  KEY documents_pm_detail_items_item_no_index (item_no),
  KEY documents_pm_detail_items_is_deleted_index (is_deleted),
  KEY documents_pm_detail_items_deleted_at_index (deleted_at),
  CONSTRAINT documents_pm_detail_items_pm_detail_fk FOREIGN KEY (pm_detail_id)
    REFERENCES documents_pm_detail (id) ON DELETE CASCADE,
  CONSTRAINT documents_pm_detail_items_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_items_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT documents_pm_detail_items_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='รายการสาเหตุ วิธีแก้ไข และผลการตรวจของใบงาน PM';
