-- ให้แผนก HR Div. จัดการหน้าจอพนักงาน (Employees) ได้ทั้งหมด
-- 1) เปิดโมดูล users ให้แผนก HR Div. (เข้าหน้าจอ / โหลดรายชื่อพนักงานได้)
-- 2) ให้สิทธิ์ สร้างผู้ใช้งาน / แก้ไขผู้ใช้งาน แก่บทบาทที่มีผู้ใช้สังกัดแผนก HR Div.
--    (ตาม pattern เดียวกับ seeder 012/014 ที่ grant สิทธิ์เอกสารให้ HR)

INSERT IGNORE INTO department_modules (department_id, module_id)
  SELECT d.id, m.id FROM departments d CROSS JOIN permission_modules m
   WHERE d.name = 'HR Div.' AND m.name = 'users'
     AND d.deleted_at IS NULL AND m.deleted_at IS NULL;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT DISTINCT u.role_id, p.id
    FROM users u
    JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
    JOIN permissions p ON p.name IN ('สร้างผู้ใช้งาน', 'แก้ไขผู้ใช้งาน') AND p.deleted_at IS NULL
   WHERE u.deleted_at IS NULL;
