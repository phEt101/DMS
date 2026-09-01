import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../src/config/env.js'

const withSeed = process.argv.includes('--seed')

if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
  throw new Error('db:fresh is disabled in production. Pass --force to confirm data loss.')
}

if (!/^[a-zA-Z0-9_]+$/.test(env.db.database)) {
  throw new Error('DB_NAME may only contain letters, numbers and underscores')
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
})

try {
  const [tables] = await connection.query<(RowDataPacket & { tableName: string })[]>(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [env.db.database],
  )

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const { tableName } of tables) {
      const safeTableName = tableName.replaceAll('`', '``')
      await connection.query(`DROP TABLE IF EXISTS \`${safeTableName}\``)
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  console.log(`dropped ${tables.length} tables from ${env.db.database}`)
} finally {
  await connection.end()
}

await import('./migrate.js')

if (withSeed) {
  await import('./seed.js')
}
