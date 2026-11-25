import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../src/config/env.js'

// Tables that must NEVER be touched by db:clean
// (ตารางที่ db:clean ห้ามแก้ไขหรือลบข้อมูลโดยเด็ดขาด)
const PRESERVED_TABLES = new Set([
  'users',
  'employees',
  // Tracking tables (schema/seeder bookkeeping)
  // (ตารางสำหรับติดตาม Migration และ Seeder)
  'migrations',
  'schema_migrations',
  'database_seeders',
])

if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
  throw new Error(
    'db:clean is disabled in production. Add --force to confirm deletion. (คำสั่ง db:clean ถูกปิดใช้งานใน Production หากต้องการยืนยันการลบข้อมูล ให้เพิ่ม --force)',
  )
}

// Parse --only=table1,table2 / --exclude=table1,table2
// (รองรับการระบุตารางที่ต้องการหรือยกเว้น โดยคั่นด้วยเครื่องหมายจุลภาค)
const parseListArg = (argName: string): string[] => {
  const values: string[] = []
  for (const arg of process.argv) {
    if (arg.startsWith(`--${argName}=`)) {
      values.push(
        ...arg
          .slice(argName.length + 3)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      )
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
  throw new Error(
    `Unknown option: ${unknownFlags.join(', ')} (พบคำสั่งที่ไม่รองรับ) Supported options: --all, --only=a,b, --exclude=a,b, --dry-run, --force (คำสั่งที่รองรับ)`,
  )
}

if (onlyTables.length > 0 && excludeTables.length > 0) {
  throw new Error(
    'Do not use --only and --exclude together. (ห้ามใช้ --only และ --exclude พร้อมกัน)',
  )
}

if (!/^[a-zA-Z0-9_]+$/.test(env.db.database)) {
  throw new Error(
    'DB_NAME may only contain letters, numbers and underscores. (ชื่อฐานข้อมูลต้องประกอบด้วยตัวอักษร ตัวเลข และเครื่องหมายขีดล่างเท่านั้น)',
  )
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
})

try {
  const [tables] = await connection.query<
    (RowDataPacket & { tableName: string })[]
  >(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [env.db.database],
  )

  const names = tables.map(({ tableName }) => tableName)

  if (onlyTables.length > 0) {
    // Explicit selection — protected tables are still off-limits.
    // (เลือกเฉพาะตารางที่ระบุ แต่ยังคงป้องกันตารางสำคัญ)
    const protectedSelected = onlyTables.filter((name) =>
      PRESERVED_TABLES.has(name),
    )

    if (protectedSelected.length > 0) {
      throw new Error(
        `These tables are protected and cannot be cleaned: ${protectedSelected.join(', ')} (ตารางเหล่านี้ถูกป้องกันและไม่สามารถล้างข้อมูลได้)`,
      )
    }

    const known = new Set(names)
    const missing = onlyTables.filter((name) => !known.has(name))

    if (missing.length > 0) {
      throw new Error(
        `Tables not found in the database: ${missing.join(', ')} (ไม่พบตารางเหล่านี้ในฐานข้อมูล)`,
      )
    }

    targets = onlyTables.filter((name) => !excludeTables.includes(name))
  } else if (excludeTables.length > 0) {
    targets = names.filter(
      (name) =>
        !PRESERVED_TABLES.has(name) && !excludeTables.includes(name),
    )
  } else {
    // Default: everything except protected tables (same as --all).
    // (ค่าเริ่มต้น: ล้างทุกตาราง ยกเว้นตารางที่ถูกป้องกัน เช่นเดียวกับ --all)
    targets = names.filter((name) => !PRESERVED_TABLES.has(name))
  }

  const dryRun = process.argv.includes('--dry-run')

  if (dryRun) {
    console.log(
      `[DRY RUN] Would clean ${targets.length} table(s); no data was deleted. (ทดลองรัน: จะล้างข้อมูล ${targets.length} ตาราง โดยยังไม่มีการลบข้อมูลจริง)`,
    )

    for (const name of targets) {
      console.log(` - ${name}`)
    }

    const preserved = names.filter((name) => !targets.includes(name))

    console.log(
      `[DRY RUN] Preserved (${preserved.length}): ${preserved.length > 0 ? preserved.join(', ') : '(none)'} (ตารางที่คงข้อมูลไว้)`,
    )

    process.exit(0)
  }

  if (targets.length === 0) {
    console.log(
      'No tables to clean. (ไม่มีตารางที่ต้องล้างข้อมูล)',
    )
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

  console.log(
    `Cleaned ${targets.length} table(s) in database ${env.db.database}. (ล้างข้อมูลสำเร็จ ${targets.length} ตาราง ในฐานข้อมูล ${env.db.database})`,
  )

  for (const name of targets) {
    console.log(` - Cleaned: ${name} (ล้างข้อมูลแล้ว)`)
  }

  const preserved = names.filter((name) => !targets.includes(name))

  console.log(
    `Preserved (${preserved.length}): ${preserved.length > 0 ? preserved.join(', ') : '(none)'} (ตารางที่คงข้อมูลไว้)`,
  )
} finally {
  await connection.end()
}
