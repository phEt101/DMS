import { db } from '../../../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

interface ProvinceRow extends RowDataPacket { province: string }
interface DistrictRow extends RowDataPacket { district: string }
interface SubdistrictRow extends RowDataPacket { subdistrict: string }
interface PostalRow extends RowDataPacket { postalCode: string }

export async function getProvinces(): Promise<ProvinceRow[]> {
  const [rows] = await db.query<ProvinceRow[]>(
    `SELECT DISTINCT province_name AS province
     FROM postal_codes
     WHERE province_name IS NOT NULL AND province_name != ''
     ORDER BY province_name ASC`,
  )
  return rows
}

export async function getDistricts(province: string): Promise<DistrictRow[]> {
  const [rows] = await db.query<DistrictRow[]>(
    `SELECT DISTINCT city_name AS district
     FROM postal_codes
     WHERE province_name = ? AND city_name IS NOT NULL AND city_name != ''
     ORDER BY city_name ASC`,
    [province],
  )
  return rows
}

export async function getSubdistricts(province: string, district: string): Promise<SubdistrictRow[]> {
  const [rows] = await db.query<SubdistrictRow[]>(
    `SELECT DISTINCT district_name AS subdistrict
     FROM postal_codes
     WHERE province_name = ? AND city_name = ? AND district_name IS NOT NULL AND district_name != ''
     ORDER BY district_name ASC`,
    [province, district],
  )
  return rows
}

export async function getPostalCode(province: string, district: string, subdistrict: string): Promise<PostalRow | null> {
  const [rows] = await db.query<PostalRow[]>(
    `SELECT postal_code AS postalCode
     FROM postal_codes
     WHERE province_name = ? AND city_name = ? AND district_name = ?
     LIMIT 1`,
    [province, district, subdistrict],
  )
  return rows[0] ?? null
}
