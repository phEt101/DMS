import type { Connection } from 'mysql2/promise'

const EQUIPMENT_ROWS: Array<[string, string, number]> = [
  ['graphic_annunciator', 'Graphic Annunciator', 1],
  ['smoke_detector', 'Smoke Detector', 2],
  ['heat_detector', 'Heat Detector', 3],
  ['manual_detector', 'Manual Detector', 4],
  ['alarm_bell', 'Alarm Bell', 5],
  ['computer', 'Computer', 6],
  ['module_box', 'Module Box', 7],
]

export async function up(connection: Connection) {
  if (EQUIPMENT_ROWS.length === 0) return

  await connection.query(
    `INSERT INTO equipment_types (code, name, sort_order)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       sort_order = VALUES(sort_order),
       is_active = VALUES(is_active)`,
    [EQUIPMENT_ROWS.map((r) => [r[0], r[1], r[2]])],
  )
}
