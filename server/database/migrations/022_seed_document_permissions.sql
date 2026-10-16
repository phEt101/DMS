-- เพิ่มสิทธิ์เอกสารที่ขาดหาย (ยื่นเอกสาร / พิจารณาเอกสาร / จัดการนโยบายการลา)
-- และ assign ให้ role ตาม flow:
--   admin: ทุกสิทธิ์ · manager: ยื่น+พิจารณา · executive/user: ยื่น
--   ผู้ใช้แผนก HR Div.: พิจารณาเอกสาร (HR อนุมัติขั้น HR ใครก็ได้ ยกเว้นผู้ยื่น)
INSERT INTO permissions (name, module_id)
SELECT perms.permission_name, permission_modules.id
FROM permission_modules
CROSS JOIN (
  SELECT 'ยื่นเอกสาร' AS permission_name
  UNION ALL SELECT 'พิจารณาเอกสาร'
  UNION ALL SELECT 'จัดการนโยบายการลา'
) AS perms
WHERE permission_modules.name = 'documents' AND permission_modules.deleted_at IS NULL
ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL;

-- admin: ทุกสิทธิ์เอกสาร
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin'
  AND permissions.name IN ('เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร', 'พิจารณาเอกสาร', 'จัดการนโยบายการลา')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;

-- manager: ยื่น + พิจารณา (ผู้จัดการแผนกเซ็นอนุมัติขั้นแรกของพนักงานในแผนกตัวเอง)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'manager'
  AND permissions.name IN ('เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร', 'พิจารณาเอกสาร')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;

-- executive / user: ยื่น
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name IN ('executive', 'user')
  AND permissions.name IN ('เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร')
  AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL;

-- ผู้ใช้แผนก HR Div. ทุกคน: สิทธิ์พิจารณาเอกสาร (ขั้น HR)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT u.role_id, p.id
  FROM users u
  JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
  JOIN permissions p ON p.name = 'พิจารณาเอกสาร' AND p.deleted_at IS NULL
 WHERE u.deleted_at IS NULL;
