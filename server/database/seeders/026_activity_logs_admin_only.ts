import type { Connection } from 'mysql2/promise'

export async function up(connection: Connection) {
  await connection.execute(
    `DELETE department_modules
       FROM department_modules
       JOIN permission_modules ON permission_modules.id = department_modules.module_id
      WHERE permission_modules.name = 'activity_logs'`,
  )
}
