import { findSettingValue, RESET_PASSWORD_ENABLED_KEY, upsertSettingValue } from '../repositories/app-settings.repository.js'

// ค่าเริ่มต้นเป็น "ปิด" เสมอ: ถ้าไม่มีแถวในตาราง ก็ถือว่าปิดอยู่
export async function isResetPasswordEnabled(): Promise<boolean> {
  const value = await findSettingValue(RESET_PASSWORD_ENABLED_KEY)
  return value === 'true'
}

export async function setResetPasswordEnabled(enabled: boolean, updatedBy: number): Promise<void> {
  await upsertSettingValue(RESET_PASSWORD_ENABLED_KEY, enabled ? 'true' : 'false', updatedBy)
}
