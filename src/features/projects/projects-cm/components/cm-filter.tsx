import type { CmPriority, CmStatus } from '../mockData'
import { CM_PRIORITIES, CM_STATUSES, CM_PROBLEM_TYPES } from '../mockData'

export function CmFilter({
  status,
  priority,
  problemType,
  onApply,
}: {
  status: string | null
  priority: string | null
  problemType: string | null
  onApply: (filters: { status?: string | null; priority?: string | null; problemType?: string | null }) => void
}) {
  return (
    <div className="dms-filter">
      <select value={status ?? ''} onChange={(e) => onApply({ status: e.target.value || null, priority, problemType })}>
        <option value="">สถานะทั้งหมด</option>
        {CM_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select value={priority ?? ''} onChange={(e) => onApply({ status, priority: e.target.value || null, problemType })}>
        <option value="">ความสำคัญทั้งหมด</option>
        {CM_PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <select value={problemType ?? ''} onChange={(e) => onApply({ status, priority, problemType: e.target.value || null })}>
        <option value="">ทุกประเภทปัญหา</option>
        {CM_PROBLEM_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  )
}
