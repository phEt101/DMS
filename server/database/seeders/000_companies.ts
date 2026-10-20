import type { Connection } from 'mysql2/promise'

const companies = ['Boswell', 'Bigmoney', 'Boswell Digital'] as const

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO companies (name, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
    [companies.map((name) => [name, 1])],
  )
}
