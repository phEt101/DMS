// The separator distinguishes days from hours; e.g. 2.4 means 2 days and 4 hours.
export function formatLeaveDayHour(days: number, hoursPerDay: number): string {
  if (!Number.isFinite(days)) return '—'
  const perDay = hoursPerDay > 0 ? hoursPerDay : 8
  let totalHours = Math.round(Math.max(days, 0) * perDay)
  let wholeDays = Math.floor(totalHours / perDay)
  let remainingHours = Math.round(totalHours - wholeDays * perDay)
  if (remainingHours >= perDay) {
    wholeDays += 1
    remainingHours = 0
  }
  return remainingHours > 0 ? `${wholeDays}.${remainingHours}` : String(wholeDays)
}
