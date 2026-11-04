-- สลิปเงินเดือน: HR อัปโหลดไฟล์ให้พนักงานแต่ละคนต่อเดือน พนักงานดูได้เฉพาะของตัวเอง
-- 1 แถว = สลิป 1 เดือนของพนักงาน 1 คน (อัปโหลดซ้ำ = แทนที่ไฟล์เดิม)
CREATE TABLE IF NOT EXISTS payslips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL COMMENT 'บริษัทของพนักงาน',
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'พนักงานเจ้าของสลิป',
  period_year SMALLINT UNSIGNED NOT NULL COMMENT 'ปีของงวดเงินเดือน (ค.ศ.)',
  period_month TINYINT UNSIGNED NOT NULL COMMENT 'เดือนของงวดเงินเดือน (1-12)',
  note VARCHAR(255) NULL COMMENT 'หมายเหตุจาก HR',
  file_path VARCHAR(255) NOT NULL COMMENT 'พาธไฟล์ภายใต้ storage/payslips',
  original_name VARCHAR(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  file_size INT UNSIGNED NOT NULL COMMENT 'ขนาดไฟล์ (ไบต์)',
  uploaded_by BIGINT UNSIGNED NULL COMMENT 'HR ผู้อัปโหลดล่าสุด',
  viewed_at TIMESTAMP NULL COMMENT 'เวลาที่พนักงานเปิดดูครั้งแรก; NULL=ยังไม่เปิดดู',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY payslips_user_period_unique (user_id, period_year, period_month),
  KEY payslips_company_period_index (company_id, period_year, period_month),
  CONSTRAINT payslips_company_fk FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT payslips_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT payslips_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='สลิปเงินเดือนของพนักงาน';

-- โมดูลสิทธิ์ "สลิปเงินเดือน" — เปิดให้ทุกแผนกเข้าหน้าได้ (พนักงานดูสลิปตัวเอง) ส่วนการอัปโหลด/จัดการจำกัดที่ admin และ HR Div. ฝั่ง API
INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
  SELECT 'documents_payslips', 'FaMoneyCheckDollar', COALESCE(MAX(sort_order), 0) + 1, 1
    FROM permission_modules
  ON DUPLICATE KEY UPDATE icon_name = VALUES(icon_name), is_active = 1, deleted_at = NULL;

INSERT IGNORE INTO department_modules (department_id, module_id)
  SELECT d.id, m.id FROM departments d CROSS JOIN permission_modules m
   WHERE m.name = 'documents_payslips' AND d.deleted_at IS NULL AND m.deleted_at IS NULL;
