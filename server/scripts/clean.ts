import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../src/config/env.js'

// Tables that must NEVER be touched by db:clean.
const PRESERVED_TABLES = new Set([
  'users',
  'employees',
  // tracking tables (schema/seeder bookkeeping)
  'migrations',
  'schema_migrations',
  'database_seeders',
])

if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
  throw new Error('db:clean ถูกปิดการใช้งานใน production หากยืนยันจะลบข้อมูลจริง ให้ใส่ --force เพิ่มเติม')
}

// Parse --only=table1,table2 / --exclude=table1,table2 (repeatable, comma-separated).
const parseListArg = (argName: string): string[] => {
  const values: string[] = []
  for (const arg of process.argv) {
    if (arg.startsWith(`--${argName}=`)) {
      values.push(...arg.slice(argName.length + 3).split(',').map((item) => item.trim()).filter(Boolean))
    }
  }
  return values
}

const onlyTables = parseListArg('only')
const excludeTables = parseListArg('exclude')
let targets: string[] = []
const unknownFlags = process.argv.filter(
  (arg) =>
    arg.startsWith('--') &&
    !['--force', '--dry-run', '--all'].includes(arg) &&
    !arg.startsWith('--only=') &&
    !arg.startsWith('--exclude='),
)
if (unknownFlags.length > 0) {
  throw new Error(`ตัวเลือกไม่รู้จัก: ${unknownFlags.join(', ')} (ตัวเลือกที่ใช้ได้: --all, --only=a,b, --exclude=a,b, --dry-run, --force)`)
}
if (onlyTables.length > 0 && excludeTables.length > 0) {
  throw new Error('ห้ามใช้ --only ร่วมกับ --exclude')
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

  const names = tables.map(({ tableName }) => tableName)

  if (onlyTables.length > 0) {
    // Explicit selection — but protected tables are still off-limits.
    const protectedSelected = onlyTables.filter((name) => PRESERVED_TABLES.has(name))
    if (protectedSelected.length > 0) {
      throw new Error(`ตารางเหล่านี้ป้องกันไว้และห้ามล้าง: ${protectedSelected.join(', ')}`)
    }
    const known = new Set(names)
    const missing = onlyTables.filter((name) => !known.has(name))
    if (missing.length > 0) {
      throw new Error(`ไม่พบตารางในฐานข้อมูล: ${missing.join(', ')}`)
    }
    targets = onlyTables.filter((name) => !excludeTables.includes(name))
  } else if (excludeTables.length > 0) {
    targets = names.filter((name) => !PRESERVED_TABLES.has(name) && !excludeTables.includes(name))
  } else {
    // Default: everything except protected tables (same as --all).
    targets = names.filter((name) => !PRESERVED_TABLES.has(name))
  }

  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log(`[ทดลองรัน] จะล้างข้อมูล ${targets.length} ตาราง (ยังไม่ได้ลบจริง):`)
    for (const name of targets) console.log(` - ${name}`)
    const preserved = names.filter((name) => !targets.includes(name))
    console.log(`[ทดลองรัน] ตารางที่คงไว้ (${preserved.length}): ${preserved.length > 0 ? preserved.join(', ') : '(ไม่มี)'}`)
    process.exit(0)
  }

  if (targets.length === 0) {
    console.log('ไม่มีตารางที่ต้องล้าง')
    process.exit(0)
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const tableName of targets) {
      const safeTableName = tableName.replaceAll('`', '``')
      await connection.query(`TRUNCATE TABLE \`${safeTableName}\``)
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  console.log(`ล้างข้อมูลเรียบร้อย: ${targets.length} ตาราง ในฐานข้อมูล ${env.db.database}`)
  for (const name of targets) console.log(` - ล้างแล้ว: ${name}`)
  const preserved = names.filter((name) => !targets.includes(name))
  console.log(`ตารางที่คงไว้ (${preserved.length}): ${preserved.length > 0 ? preserved.join(', ') : '(ไม่มี)'}`)
} finally {
  await connection.end()
}
