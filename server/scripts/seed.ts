import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../src/config/env.js'

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../database/seeders')
const databaseName = env.db.database

if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may only contain letters, numbers and underscores')
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: databaseName,
  user: env.db.user,
  password: env.db.password,
  multipleStatements: true,
})

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS database_seeders (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const files = (await fs.readdir(directory))
    .filter((file) => file.endsWith('.sql') || file.endsWith('.js') || file.endsWith('.ts'))
    .sort()
  const [appliedRows] = await connection.query<(RowDataPacket & { name: string })[]>('SELECT name FROM database_seeders')
  const applied = new Set(appliedRows.map((row) => row.name))

  for (const file of files) {
    const trackingName = file.replace(/\.(?:js|ts)$/, '.ts')
    if (applied.has(trackingName)) {
      console.log(`skip ${file}`)
      continue
    }

    await connection.beginTransaction()
    try {
      const filePath = path.join(directory, file)

      if (file.endsWith('.sql')) {
        const sql = await fs.readFile(filePath, 'utf8')
        await connection.query(sql)
      } else {
        const seeder = await import(pathToFileURL(filePath).href)

        if (typeof seeder.up !== 'function') {
          throw new Error(`${file} must export an up(connection) function`)
        }

        await seeder.up(connection)
      }

      await connection.execute('INSERT INTO database_seeders (name) VALUES (?)', [trackingName])
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
