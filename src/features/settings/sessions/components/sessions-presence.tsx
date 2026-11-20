import type { PresenceFilter, PresenceStatus, SessionsSummary } from '../services/sessions.service'
import type { SessionsCopy } from '../sessions-copy'

const LEVELS: Array<{ key: PresenceStatus; levelClass: string }> = [
  { key: 'active', levelClass: 'is-active-level' },
  { key: 'idle', levelClass: 'is-idle-level' },
  { key: 'offline', levelClass: 'is-offline-level' },
]

export function SessionsPresence({
  summary,
  status,
  copy,
  onStatusChange,
  onShowOnline,
  onShowAll,
}: {
  summary: SessionsSummary
  status: PresenceFilter
  copy: SessionsCopy
  onStatusChange: (status: PresenceStatus) => void
  onShowOnline: () => void
  onShowAll: () => void
}) {
  const isSelected = (level: PresenceStatus) =>
    status === level || (status === 'online' && (level === 'active' || level === 'idle'))
  const totalLabel = copy.onlineSummary
    .replace('{online}', summary.online.toLocaleString())
    .replace('{total}', summary.total.toLocaleString())

  return (
    <section className="sessions-presence" aria-label={copy.title}>
      <div className="sessions-presence-head">
        <p className="sessions-presence-total">{totalLabel}</p>
        <div className="sessions-presence-actions">
          {status !== 'online' && (
            <button type="button" className="sessions-presence-reset" onClick={onShowOnline}>
              {copy.showOnlineOnly}
            </button>
          )}
          {status !== 'all' && (
            <button type="button" className="sessions-presence-reset" onClick={onShowAll}>
              {copy.showAllStatuses}
            </button>
          )}
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="sessions-bar-empty">{copy.empty}</div>
      ) : (
        <div className="sessions-presence-bar">
          {LEVELS.map(({ key, levelClass }) => {
            const count = summary[key]
            const selected = isSelected(key)
            return (
              <button
                key={key}
                type="button"
                className={`sessions-presence-segment ${levelClass}${selected ? ' is-selected' : ''}`}
                style={{
                  flexGrow: count,
                  flexBasis: count > 0 ? 0 : 'auto',
                  minWidth: count > 0 ? 96 : 64,
                }}
                aria-pressed={selected}
                aria-label={`${copy.presence[key]} ${count}`}
                disabled={count === 0}
                onClick={() => onStatusChange(key)}
              >
                <span className="sessions-presence-label">{copy.presence[key]}</span>
                <span className="sessions-presence-count">{count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
