import { useEffect, useState } from 'react'
import { request } from '../../../../services/api'
import { ActiveStatusControl } from '../../components/active-status-control'

// ตั้งค่า admin: เปิด/ปิดหน้ารีเซ็ทรหัสผ่าน (ค่าเริ่มต้น = ปิด)
export function ResetPasswordSetting() {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    request('/auth/reset-password-status')
      .then((json: { data: { enabled: boolean } }) => {
        if (!cancelled) setEnabled(json.data.enabled)
      })
      .catch(() => {
        if (!cancelled) setError('โหลดสถานะหน้ารีเซ็ทรหัสผ่านไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = async (next: boolean) => {
    setError('')
    setSaving(true)
    try {
      const json: { data: { enabled: boolean } } = await request('/app-settings/reset-password', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: next }),
      })
      setEnabled(json.data.enabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="settings-section">
      <header>
        <h2>หน้ารีเซ็ทรหัสผ่าน</h2>
        <p>เปิดให้ผู้ใช้เปลี่ยนรหัสผ่านด้วยอีเมลจากหน้าล็อกอิน เมื่อปิด หน้านี้จะแสดงว่าถูกปิดอยู่</p>
      </header>
      <ActiveStatusControl
        active={enabled}
        statusLabel="สถานะหน้ารีเซ็ทรหัสผ่าน"
        activeLabel="เปิดใช้งาน"
        inactiveLabel="ปิดใช้งาน"
        onChange={handleChange}
        disabled={!loaded || saving}
      />
      {error && <p className="signin-error" role="alert">{error}</p>}
    </section>
  )
}
