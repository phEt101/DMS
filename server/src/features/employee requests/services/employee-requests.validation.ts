export type Kind = 'leave' | 'ot' | 'timefix' | 'outing'
export type Values = Record<string, string | boolean>

export type Policy = {
  id: number; year: number; yearStart: string; yearEnd: string
  leadPersonal: number; leadVacation: number; hoursPerDay: number; hourStep: number
  certDays: number; otMax: number; fixDays: number
}
export type LeaveTypeRow = { id: number; code: string; balanceBucket: 'sick' | 'personal' | 'vacation' | 'other' | 'none'; allowByHour: boolean }

export type ValidationContext = {
  policy: Policy
  today: string // YYYY-MM-DD (เวลาไทย)
  leaveType?: LeaveTypeRow
  entitlement: { sick: number; personal: number; vacation: number }
  usedByBucket: Record<string, number> // รวมใบที่รออนุมัติ + อนุมัติแล้ว ภายในปีนโยบาย
  hasOverlap: boolean
}

// key ตรงกับ copy.validation[key] ในฟรอนต์ — ฟรอนต์แปลข้อความเอง
export type Check = { ok: boolean; key: string; params?: Record<string, string | number> }

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`)
const dow = (iso: string) => utc(iso).getUTCDay()
export const diffDays = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000)
export const weekdaysBetween = (from: string, to: string) => {
  if (!from || !to || to < from) return 0
  let count = 0
  const total = diffDays(from, to)
  for (let i = 0; i <= total; i += 1) { const d = (dow(from) + i) % 7; if (d !== 0 && d !== 6) count += 1 }
  return count
}
const minutes = (value: string) => {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1
}

const DATE_KEYS = ['from', 'to', 'date']
const TIME_KEYS = ['start', 'end', 'inTime', 'outTime', 'backTime']

export function validateRequest(kind: Kind, input: Values, ctx: ValidationContext): { checks: Check[]; values: Values } {
  const values: Values = { ...input }
  for (const key of DATE_KEYS) if (key in values && !/^\d{4}-\d{2}-\d{2}$/.test(String(values[key]))) values[key] = ''
  for (const key of TIME_KEYS) if (key in values && !/^\d{2}:\d{2}$/.test(String(values[key]))) values[key] = ''

  const checks: Check[] = []
  const add = (ok: boolean, key: string, params?: Check['params']) => checks.push({ ok, key, params })
  const v = (key: string) => String(values[key] ?? '').trim()
  const { policy: p, today } = ctx

  if (kind === 'leave') {
    const type = v('leaveType'), from = v('from'), to = v('to')
    const isHour = Boolean(ctx.leaveType?.allowByHour) && (values.byHour === true || (!values.byHour && Number(values.hours ?? '') > 0))
    let qty = Number(v('days'))
    add(Boolean(from && to && to >= from), 'dateRange')
    if (isHour) {
      const start = minutes(v('start')), end = minutes(v('end')), hours = (end - start) / 60
      const typedHours = Number(v('hours'))
      if (start >= 0 && end > start) {
        // มีเวลาเริ่ม/สิ้นสุด → คำนวณจากช่วงเวลาเหมือนเดิม (ไม่จำกัดจำนวนชั่วโมงต่อวัน)
        add(start >= 0 && end > start, 'endAfterStart')
        const rounded = hours > 0 ? Math.ceil(hours / p.hourStep) * p.hourStep : 0
        values.hours = rounded ? String(rounded) : ''
        values.days = rounded ? String(rounded / p.hoursPerDay) : ''
      } else {
        // พิมพ์จำนวนชั่วโมงตรง ๆ ได้เลย (ไม่ต้องใส่เวลาเริ่ม/สิ้นสุด) — ไม่จำกัดจำนวนชั่วโมงต่อวัน
        add(typedHours > 0, 'hourlyLeavePositive')
        const rounded = typedHours > 0 ? Math.ceil(typedHours / p.hourStep) * p.hourStep : 0
        values.hours = rounded ? String(rounded) : ''
        values.days = rounded ? String(rounded / p.hoursPerDay) : ''
      }
      qty = Number(values.days) || 0
    } else {
      values.byHour = false
      add(qty > 0, 'daysPositive')
    }
    add(Boolean(v('reason')), type === 'emergency' ? 'emergencyReason' : 'leaveReason')
    if (from && to && to >= from) add(!ctx.hasOverlap, 'overlap')

    const leadDays = from ? diffDays(today, from) : 0
    const todayIsWeekday = ![0, 6].includes(dow(today))
    const leadWorkdays = from ? weekdaysBetween(today, from) - (today <= from && todayIsWeekday ? 1 : 0) : 0
    if (type === 'personal' || type === 'unpaid') add(leadDays >= p.leadPersonal, 'personalLead', { days: p.leadPersonal })
    if (type === 'vacation') add(leadWorkdays >= p.leadVacation, 'vacationLead', { days: p.leadVacation })
    if (type === 'emergency') add(Boolean(from && from >= today), 'emergencyFromToday')
    if (['sick', 'personal', 'vacation', 'emergency'].includes(type) && from && to) {
      add(from >= p.yearStart && to <= p.yearEnd, 'withinYear', { year: p.year, from: p.yearStart, to: p.yearEnd })
    }

    // ยอดคงเหลือคิดตามโควตา (bucket) — ลาพักร้อนฉุกเฉินตัดจากโควตาพักร้อนร่วมกัน
    const remaining = (bucket: 'sick' | 'personal' | 'vacation') => ctx.entitlement[bucket] - (ctx.usedByBucket[bucket] ?? 0)
    // ส่ง hoursPerDay ไปให้ฟรอนต์แปลงจำนวนวันเป็น "X วัน Y ชั่วโมง" เมื่อลาเป็นชั่วโมง (เช่น 0.375 วัน = 3 ชั่วโมง)
    const hoursPerDay = p.hoursPerDay
    if (type === 'sick' || type === 'personal' || type === 'vacation') {
      const left = remaining(type)
      add(qty <= left, 'leaveBalance', { type, remaining: Math.max(0, left), requested: qty || 0, hoursPerDay, isHour: isHour ? 1 : 0 })
    }
    if (type === 'emergency') {
      add(remaining('personal') <= 0, 'usePersonalFirst', { days: Math.max(0, remaining('personal')), hoursPerDay, isHour: isHour ? 1 : 0 })
      add(qty <= remaining('vacation'), 'vacationBalance', { days: remaining('vacation'), hoursPerDay, isHour: isHour ? 1 : 0 })
    }
    if (type === 'sick' && from && to && to >= from) {
      const span = diffDays(from, to) + 1
      const needsCert = qty >= p.certDays || [1, 5].includes(dow(from)) || [1, 5].includes(dow(to)) || weekdaysBetween(from, to) < span
      if (needsCert) add(values.cert === true, 'certificateRequired')
    }
  }

  if (kind === 'ot') {
    const start = minutes(v('start')), end = minutes(v('end')), hours = (end - start) / 60
    add(Boolean(v('date')), 'otDate')
    add(start >= 0 && end > start, 'endAfterStart')
    add(hours > 0 && hours <= p.otMax, 'otLimit', { hours: p.otMax })
    add(Boolean(v('task')), 'taskRequired')
    add(Boolean(v('reason')), 'otReason')
    values.hours = hours > 0 ? String(Math.round(hours * 2) / 2) : ''
  }

  if (kind === 'timefix') {
    const date = v('date')
    add(Boolean(date && date < today), 'pastDate')
    add((date ? diffDays(date, today) : Infinity) <= p.fixDays, 'fixLimit', { days: p.fixDays })
    add(Boolean(v('inTime') || v('outTime')), 'timeRequired')
    add(Boolean(v('reason')), 'detailsRequired')
  }

  if (kind === 'outing') {
    add(Boolean(v('from') && v('to') && v('to') >= v('from')), 'validRange')
    add(Boolean(v('from') && v('from') >= today), 'todayOrFuture')
    add(minutes(v('outTime')) >= 0, 'outTimeRequired')
    add(!v('backTime') || minutes(v('backTime')) > minutes(v('outTime')), 'backAfterOut')
    add(Boolean(v('company')), 'companyRequired')
    add(Boolean(v('address')), 'addressRequired')
    add(Boolean(v('workDetails')), 'workDetailsRequired')
    add(!v('phone') || (/^[0-9+()\s-]{8,50}$/.test(v('phone')) && v('phone').replace(/\D/g, '').length >= 8), 'phoneInvalid')
  }

  return { checks, values }
}