import type { RowDataPacket } from 'mysql2/promise'

import { db } from '../../../../config/database.js'

export const RESET_PASSWORD_ENABLED_KEY = 'auth.reset_password_enabled'

interface SettingRow extends RowDataPacket {
  settingValue: string
}

export async function findSettingValue(key: string): Promise<string | null> {
  const [rows] = await db.execute<SettingRow[]>(
    'SELECT setting_value AS settingValue FROM app_settings WHERE setting_key = ? LIMIT 1',
    [key],
  )
  return rows[0]?.settingValue ?? null
}

export async function upsertSettingValue(key: string, value: string, updatedBy: number): Promise<void> {
  await db.execute(
    `INSERT INTO app_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [key, value, updatedBy],
  )
}
