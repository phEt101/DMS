export function formatLeaveDayHour(days: number, hoursPerDay: number, dayLabel: string, hourLabel: string, minuteLabel: string): string {
  if (!Number.isFinite(days)) return '—'
  const perDay = hoursPerDay > 0 ? hoursPerDay : 8
  let totalHours = Math.round(Math.max(days, 0) * perDay * 10) / 10
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
