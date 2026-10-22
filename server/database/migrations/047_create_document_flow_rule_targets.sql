-- รองรับกฎที่เลือกได้หลายแผนก/หลายบทบาทในกฎเดียว
-- เช่น "แผนก A, B, C ใช้ flow เดียวกัน" หรือ "บทบาท user + manager ใช้ flow เดียวกัน"
-- โครงสร้างเดิม (department_id / role_id ต่อแถว) ยังใช้งานได้: แถวเดิมจะถูกย้ายมาเป็น 1 target ต่อกฎ
-- กฎใหม่จะเขียนเฉพาะตาราง targets (department_id / role_id ของกฎถูกตั้งเป็น NULL)
CREATE TABLE IF NOT EXISTS document_flow_rule_targets (
  rule_id BIGINT UNSIGNED NOT NULL COMMENT 'กฎที่ target อ้างถึง',
  scope ENUM('department','role') NOT NULL COMMENT 'ชนิดของ target',
  target_id BIGINT UNSIGNED NOT NULL COMMENT 'id ของแผนก (scope=department) หรือบทบาท (scope=role)',
  PRIMARY KEY (rule_id, scope, target_id),
  KEY document_flow_rule_targets_target_index (scope, target_id),
  CONSTRAINT document_flow_rule_targets_rule_fk FOREIGN KEY (rule_id) REFERENCES document_flow_rules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='แผนก/บทบาทที่กฎ flow ครอบคลุม (หลาย target ต่อกฎ)';

-- ย้าย target เดิม (department_id / role_id ต่อแถว) เข้าตาราง targets — ทำซ้ำได้ปลอดภัย
INSERT IGNORE INTO document_flow_rule_targets (rule_id, scope, target_id)
  SELECT id, 'department', department_id FROM document_flow_rules WHERE department_id IS NOT NULL;
INSERT IGNORE INTO document_flow_rule_targets (rule_id, scope, target_id)
  SELECT id, 'role', role_id FROM document_flow_rules WHERE role_id IS NOT NULL;
