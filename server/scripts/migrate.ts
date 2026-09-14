import fs from 'node:fs/promises'
import path from 'node:path'
import { createHmac } from 'node:crypto'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../src/config/env.js'

const directory = path.resolve('database/migrations')
const databaseName = env.db.database

if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may only contain letters, numbers and underscores')
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  multipleStatements: true,
})

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.query(`USE \`${databaseName}\``)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort()
  const [appliedRows] = await connection.query<(RowDataPacket & { name: string })[]>('SELECT name FROM schema_migrations')
  const applied = new Set(appliedRows.map((row) => row.name))

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`)
      continue
    }
    const sql = await fs.readFile(path.join(directory, file), 'utf8')
    await connection.beginTransaction()
    try {
      await connection.query(sql)
      await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file])
      await connection.commit()
      console.log(`applied ${file}`)
    } catch (error) {
      await connection.rollback()
      throw error
    }
  }

  const [projectColumns] = await connection.query<(RowDataPacket & { Null: 'YES' | 'NO' })[]>(
    "SHOW COLUMNS FROM projects LIKE 'encrypted_id'",
  )
  if (projectColumns.length) {
    if (env.projectPublicIdSecret.length < 32) {
      throw new Error('PROJECT_PUBLIC_ID_SECRET must contain at least 32 characters before migrating project public IDs')
    }
    const [projects] = await connection.query<(RowDataPacket & { id: number; encryptedId: string | null })[]>(
      'SELECT id, encrypted_id AS encryptedId FROM projects',
    )
    for (const project of projects) {
      const encryptedId = createHmac('sha256', env.projectPublicIdSecret)
        .update(`projects:${project.id}`)
        .digest('base64url')
      if (project.encryptedId !== encryptedId) {
        await connection.execute('UPDATE projects SET encrypted_id = ? WHERE id = ?', [encryptedId, project.id])
      }
    }
    if (projectColumns[0]?.Null === 'YES') {
      await connection.query('ALTER TABLE projects MODIFY encrypted_id CHAR(43) NOT NULL')
    }
  }
} finally {
  await connection.end()
}
