import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connection } from 'mysql2/promise'

interface PostalCodeRow {
  postalCode: string
  districtName: string
  cityName: string
  provinceName: string
  countryCode: string
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

async function readPostalCodeRows(): Promise<PostalCodeRow[]> {
  const csvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../files/MS_Post code_R2.csv')
  const csvContent = await fs.readFile(csvPath, 'utf8')

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const rows: PostalCodeRow[] = []

  for (const line of lines.slice(1)) {
    const [postalCodeRaw, districtName, cityName, provinceName, countryCodeRaw] = parseCsvLine(line)

    if (!postalCodeRaw || !districtName || !cityName || !provinceName) {
      continue
    }

    const postalCode = postalCodeRaw.replace(/\D/g, '').slice(0, 5)
    const countryCode = countryCodeRaw && countryCodeRaw.trim() ? countryCodeRaw.trim() : 'TH'

    if (!postalCode) {
      continue
    }

    rows.push({
      postalCode,
      districtName: districtName.replace(/\s+/g, ' ').trim(),
      cityName: cityName.replace(/\s+/g, ' ').trim(),
      provinceName: provinceName.replace(/\s+/g, ' ').trim(),
      countryCode,
    })
  }

  return rows
}

export async function up(connection: Connection) {
  const rows = await readPostalCodeRows()

  if (rows.length === 0) {
    return
  }

  const batchSize = 500

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)

    await connection.query(
      `INSERT INTO postal_codes (postal_code, district_name, city_name, province_name, country_code)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         district_name = VALUES(district_name),
         city_name = VALUES(city_name),
         province_name = VALUES(province_name),
         country_code = VALUES(country_code)`,
      [batch.map((row) => [row.postalCode, row.districtName, row.cityName, row.provinceName, row.countryCode])],
    )
  }
}
