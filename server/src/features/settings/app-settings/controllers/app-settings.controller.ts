import type { RequestHandler } from 'express'

import { httpError } from '../../../../middleware/errors.js'
import { logActivity } from '../../activity/repositories/activity.repository.js'
import { isResetPasswordEnabled, setResetPasswordEnabled } from '../services/app-settings.service.js'

// สถานะเปิด/ปิดหน้ารีเซ็ทรหัสผ่าน (public: หน้า reset ต้องรู้ได้ก่อนล็อกอิน)
export const getResetPasswordStatus: RequestHandler = async (_req, res, next) => {
  try {
    const enabled = await isResetPasswordEnabled()
    res.json({ data: { enabled } })
  } catch (error) {
    next(error)
  }
}

// admin เปิด/ปิดหน้ารีเซ็ทรหัสผ่าน
export const updateResetPasswordStatus: RequestHandler = async (req, res, next) => {
  try {
    const enabled = (req.body as { enabled?: unknown } | undefined)?.enabled
    if (typeof enabled !== 'boolean') throw httpError(400, 'enabled must be a boolean')
    if (!req.user) throw httpError(401, 'Authentication required')

    await setResetPasswordEnabled(enabled, req.user.id)
    await logActivity({
      userId: req.user.id,
      module: 'settings',
      action: enabled ? 'reset_password_enabled' : 'reset_password_disabled',
      entityType: 'app_setting',
      // activity_logs.entity_id เป็น BIGINT; เก็บ key ที่เป็นข้อความไว้ใน details แทน
      details: { key: 'auth.reset_password_enabled', enabled },
      ipAddress: req.ip,
    })
    res.json({ data: { enabled } })
  } catch (error) {
    next(error)
  }
}
