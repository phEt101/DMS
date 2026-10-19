-- HR Div. users can manage leave policy; the API also restricts this permission by department.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT u.role_id, p.id
  FROM users u
  JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
  JOIN permissions p ON p.name = 'จัดการนโยบายการลา' AND p.deleted_at IS NULL
 WHERE u.deleted_at IS NULL;
