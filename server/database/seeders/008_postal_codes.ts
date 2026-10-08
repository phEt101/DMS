import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Type: mysql2/promise Connection - keep as any to avoid strict runtime dependency
export async function up(connection: any) {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const csvPath = path.join(dir, '../file/MS_Post code_R2.csv')

  const raw = await fs.readFile(csvPath, 'utf8')
  const content = raw.replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length <= 1) {
    console.log('no postal code rows found in CSV')
    return
  }

  // Remove header
  lines.shift()

  const insertSql = `INSERT IGNORE INTO postal_codes
    (postal_code, district_name, city_name, province_name, country_code)
    VALUES (?, ?, ?, ?, ?)`

  const parseCsvRow = (row: string) => {
    // Simple CSV parser that supports quoted fields with commas
    const cols: string[] = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (ch === ',' && !inQuotes) {
        cols.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur)
    return cols.map((c) => c.trim())
  }

  const stripPrefix = (s: string) => s.replace(/^(ตำบล|แขวง|อำเภอ|เขต|จังหวัด)\s*/i, '').trim()

  for (const line of lines) {
    const [postal_code_raw, district_raw = '', city_raw = '', province_raw = '', country_raw = 'TH'] = parseCsvRow(line)
    const postal_code = (postal_code_raw || '').toString().trim()
    if (!postal_code) continue

    const district_name = stripPrefix(district_raw)
    const city_name = stripPrefix(city_raw)
    const province_name = stripPrefix(province_raw)
    const country_code = (country_raw || 'TH').trim()

    await connection.execute(insertSql, [postal_code, district_name, city_name, province_name, country_code])
  }

  console.log(`applied postal_codes seeder (${lines.length} rows checked)`) 
}
