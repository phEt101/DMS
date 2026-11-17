import type { LedgerEntry } from '../leave-ledger'

export type LeaveBalanceType = 'sick' | 'personal' | 'vacation'

export function getLeaveUsage(entries: LedgerEntry[], type: LeaveBalanceType) {
  return entries.reduce((usage, entry) => {
    if (entry.leaveType !== type || entry.days == null) return usage
    if (entry.status === 'approved') usage.used += entry.days
    else if (entry.status === 'pending_mgr' || entry.status === 'pending_exec' || entry.status === 'pending_hr') usage.pending += entry.days
    return usage
  }, { used: 0, pending: 0 })
}
