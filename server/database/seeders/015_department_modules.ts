import type { Connection } from 'mysql2/promise'

export async function up(connection: Connection) {
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT DISTINCT u.department_id, target.id
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
       CROSS JOIN permission_modules target
      WHERE u.department_id IS NOT NULL AND u.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND ((r.name = 'executive' AND target.name IN ('dashboard','projects','projects_cm','survey','report','activity_logs','users'))
          OR (r.name = 'manager' AND target.name IN ('dashboard','projects','projects_cm','survey','report','activity_logs'))
          OR (r.name = 'user' AND target.name IN ('dashboard','projects','projects_cm')))`,
  )
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT DISTINCT u.department_id, target.id
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       CROSS JOIN permission_modules target
      WHERE u.department_id IS NOT NULL AND u.deleted_at IS NULL AND target.deleted_at IS NULL
        AND ((p.name = 'ยื่นเอกสาร' AND target.name IN ('documents','documents_ledger','documents_notifications'))
          OR (p.name = 'พิจารณาเอกสาร' AND target.name = 'documents_pending')
          OR (p.name = 'จัดการนโยบายการลา' AND target.name = 'documents_policy'))`,
  )
  await connection.execute(
    `INSERT IGNORE INTO department_modules SELECT d.id, m.id FROM departments d CROSS JOIN permission_modules m
     WHERE d.name = 'HR Div.' AND m.name IN ('documents','documents_pending','documents_ledger','documents_employees','documents_policy','documents_notifications')
       AND d.deleted_at IS NULL AND m.deleted_at IS NULL`,
  )
}
