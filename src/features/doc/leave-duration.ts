// ฐานข้อมูลเก็บ days เป็นทศนิยม 2 ตำแหน่ง ทำให้ 0.0625 วัน (30 นาที) กลายเป็น 0.06 วัน = 0.48 ชม.
// จึง snap จำนวนชั่วโมงเข้าหาขั้น hourStep (ค่าเริ่มต้น 0.5 = 30 นาที) ก่อนแปลงเป็นข้อความ เพื่อให้แสดง "30 นาที" เสมอ
export function formatLeaveDayHour(days: number, hoursPerDay: number, dayLabel: string, hourLabel: string, minuteLabel: string, hourStep = 0.5): string {
  if (!Number.isFinite(days)) return '—'
  const perDay = hoursPerDay > 0 ? hoursPerDay : 8
  const step = hourStep > 0 ? hourStep : 0.5
  const rawHours = Math.max(days, 0) * perDay
  // snap เข้าหาขั้นที่ใกล้ที่สุด (คลาดเคลื่อนจากการปัดทศนิยมในฐานข้อมูล)
  let totalHours = Math.round(rawHours / step) * step
  let wholeDays = Math.floor(totalHours / perDay)
  let remainingHours = Math.round((totalHours - wholeDays * perDay) * 10) / 10
  if (remainingHours >= perDay) {
    wholeDays += 1
    remainingHours = 0
  }
  let wholeHours = Math.floor(remainingHours)
  let minutes = Math.round((remainingHours - wholeHours) * 60)
  if (minutes >= 60) {
    wholeHours += 1
    minutes = 0
  }
  if (wholeHours >= perDay) {
    wholeDays += 1
    wholeHours = 0
  }
  const parts = wholeDays > 0 || (wholeHours === 0 && minutes === 0) ? [`${wholeDays} ${dayLabel}`] : []
  if (wholeHours > 0) parts.push(`${wholeHours} ${hourLabel}`)
  if (minutes > 0) parts.push(`${minutes} ${minuteLabel}`)
  return parts.join(' ')
}
