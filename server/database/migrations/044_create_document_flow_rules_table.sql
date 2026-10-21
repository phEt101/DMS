-- กำหนดสิทธิ์ในการยื่นเอกสาร (Flow): แผนก/บทบาทไหนยื่นแล้วส่งไปให้ใครพิจารณา
-- 1 แถว = กฎของแผนกหนึ่ง (scope = department) หรือบทบาทหนึ่ง (scope = role)
-- ค่า NULL หรือ 'default' = ใช้ flow เริ่มต้นที่เขียนไว้ในโค้ด (ตาม role ของผู้ยื่น)
CREATE TABLE IF NOT EXISTS document_flow_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL COMMENT 'บริษัทเจ้าของกฎ',
  scope ENUM('department','role') NOT NULL DEFAULT 'department' COMMENT 'กฎผูกกับแผนกหรือบทบาท',
  department_id BIGINT UNSIGNED NULL COMMENT 'แผนก (เมื่อ scope=department)',
  role_id BIGINT UNSIGNED NULL COMMENT 'บทบาท (เมื่อ scope=role)',
  kind VARCHAR(20) NOT NULL DEFAULT 'all' COMMENT 'ประเภทเอกสาร: leave/ot/timefix/wfh/outing/swap/all',
  first_stage ENUM('default','pending_mgr','pending_exec','pending_hr') NOT NULL DEFAULT 'pending_mgr' COMMENT 'ขั้นแรกที่เอกสารเข้า',
  manager_user_id BIGINT UNSIGNED NULL COMMENT 'ผู้จัดการที่กำหนดเอง (แทน manager ประจำแผนกของผู้ยื่น)',
  executive_user_id BIGINT UNSIGNED NULL COMMENT 'ผู้ประกอบการที่กำหนดเอง',
  require_manager_stage BOOLEAN NOT NULL DEFAULT TRUE COMMENT '0=ข้ามขั้นผู้จัดการ (ส่งตรง executive/HR)',
  require_executive_stage BOOLEAN NOT NULL DEFAULT FALSE COMMENT '1=บังคับผ่านขั้นผู้ประกอบการ',
  require_hr_stage BOOLEAN NOT NULL DEFAULT TRUE COMMENT '0=จบที่ผู้จัดการ/ผู้ประกอบการ ไม่ต้องส่ง HR',
  record_after_stage ENUM('manager','executive','hr') NULL COMMENT 'ขั้นที่อนุมัติแล้วเอกสารถือว่าจบ (approved) และเริ่มบันทึกลงสมุด/รายงาน — NULL=ขั้นสุดท้ายของ flow',
  visible_in_records BOOLEAN NOT NULL DEFAULT TRUE COMMENT '0=ประเภทเอกสารนี้แสดงเฉพาะตอนยื่น/พิจารณา ไม่แสดงในสมุดบันทึกการลา/รายงาน',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '1=ใช้งานกฎนี้',
  updated_by BIGINT UNSIGNED NULL COMMENT 'ผู้แก้ไขล่าสุด',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY document_flow_rules_unique (company_id, scope, department_id, role_id, kind),
  KEY document_flow_rules_company_index (company_id, is_active),
  KEY document_flow_rules_department_index (department_id),
  KEY document_flow_rules_role_index (role_id),
  CONSTRAINT document_flow_rules_company_fk FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT document_flow_rules_department_fk FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT document_flow_rules_role_fk FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT document_flow_rules_manager_fk FOREIGN KEY (manager_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT document_flow_rules_executive_fk FOREIGN KEY (executive_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT document_flow_rules_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='กำหนดสิทธิ์ในการยื่นเอกสาร: แผนก/บทบาทยื่นแล้วไปให้ใครอนุมัติ';

-- เพิ่ม snapshot ของ flow ที่ใช้ ณ ตอนยื่น (กันกฎถูกแก้ภายหลังแล้วเอกสารเก่าเดินตามกฎใหม่)
ALTER TABLE employee_requests
  ADD COLUMN flow_json JSON NULL COMMENT 'flow ที่ใช้ ณ ตอนยื่น: {manager,executive,hr} ขั้นที่ต้องผ่านหลังขั้นแรก' AFTER route_to;

-- เพิ่มคอลัมน์ของ flow rules (จบที่ขั้นไหนถึงบันทึก + ซ่อนจากสมุด/รายงาน) — สำหรับฐานข้อมูลที่สร้างตารางไปแล้ว
ALTER TABLE document_flow_rules
  ADD COLUMN record_after_stage ENUM('manager','executive','hr') NULL COMMENT 'ขั้นที่อนุมัติแล้วเอกสารถือว่าจบ (approved) และเริ่มบันทึกลงสมุด/รายงาน — NULL=ขั้นสุดท้ายของ flow' AFTER require_hr_stage,
  ADD COLUMN visible_in_records BOOLEAN NOT NULL DEFAULT TRUE COMMENT '0=ประเภทเอกสารนี้แสดงเฉพาะตอนยื่น/พิจารณา ไม่แสดงในสมุดบันทึกการลา/รายงาน' AFTER record_after_stage;
