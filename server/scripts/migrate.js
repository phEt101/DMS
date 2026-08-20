import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../database/migrations')
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
  const [appliedRows] = await connection.query('SELECT name FROM schema_migrations')
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
} finally {
  await connection.end()
}
