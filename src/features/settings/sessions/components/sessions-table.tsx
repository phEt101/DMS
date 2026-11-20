import { FaDesktop, FaMobileScreen, FaTabletScreenButton } from 'react-icons/fa6'

import { avatarSrc } from '../../../../services/avatar'
import type { SessionsCopy } from '../sessions-copy'
import { deviceLabel, formatDateTime, initials } from '../sessions-format'
import type { PresenceFilter, PresenceStatus, SessionUserRow } from '../services/sessions.service'

const DEVICE_ICONS = {
  desktop: FaDesktop,
  mobile: FaMobileScreen,
  tablet: FaTabletScreenButton,
  unknown: FaDesktop,
}

function statusKeyOf(row: SessionUserRow): PresenceStatus | 'never' {
  if (!row.hasSession) return 'never'
  return row.presence
}

function emptyMessage(status: PresenceFilter, copy: SessionsCopy): string {
  if (status === 'active') return copy.emptyActive
  if (status === 'idle') return copy.emptyIdle
  if (status === 'offline') return copy.emptyOffline
  if (status === 'all') return copy.emptyAll
  return copy.emptyOnline
}

export function SessionsTable({
  rows,
  loading,
  error,
  status,
  copy,
  language,
  onRetry,
  onSwitchStatus,
}: {
  rows: SessionUserRow[]
  loading: boolean
  error: string
  status: PresenceFilter
  copy: SessionsCopy
  language: 'th' | 'en'
  onRetry: () => void
  onSwitchStatus: (status: PresenceFilter) => void
}) {
  const columnCount = 8

  let body
  if (loading) {
    body = <tr><td className="table-message" colSpan={columnCount}>{copy.loading}</td></tr>
  } else if (error) {
    body = (
      <tr>
        <td className="table-message" colSpan={columnCount}>
          <span>{error}</span>
          <button type="button" className="secondary-button sessions-empty-action" onClick={onRetry}>
            {copy.retry}
          </button>
        </td>
      </tr>
    )
  } else if (rows.length === 0) {
    const canShowOffline = status !== 'offline'
    body = (
      <tr>
        <td className="table-message" colSpan={columnCount}>
          <span>{emptyMessage(status, copy)}</span>
          <button
            type="button"
            className="secondary-button sessions-empty-action"
            onClick={() => onSwitchStatus(canShowOffline ? 'offline' : 'all')}
          >
            {canShowOffline ? copy.emptyActionOffline : copy.emptyActionAll}
          </button>
        </td>
      </tr>
    )
  } else {
    body = rows.map((row) => {
      const level = statusKeyOf(row)
      const levelLabel = level === 'never' ? copy.presence.never : copy.presence[level]
      const DeviceIcon = DEVICE_ICONS[row.device?.type ?? 'unknown']
      const rowClass = row.presence === 'active' ? undefined : row.presence === 'idle' ? 'is-idle-row' : 'is-offline-row'

      return (
        <tr key={`${row.id}-${row.sessionId ?? 'none'}`} className={rowClass}>
          <td data-label={copy.table.user}>
            <div className="user-identity">
              {avatarSrc(row.avatarUrl)
                ? <img className="user-avatar user-avatar--image" src={avatarSrc(row.avatarUrl)!} alt={row.name} />
                : <span className="user-avatar">{initials(row.name)}</span>}
              <strong>{row.name}</strong>
            </div>
          </td>
          <td data-label={copy.table.company}>{row.company || '—'}</td>
          <td className="sessions-email" data-label={copy.table.email}>{row.email}</td>
          <td data-label={copy.table.department}>{row.department || '—'}</td>
          <td data-label={copy.table.role}><span className="role-badge">{row.role}</span></td>
          <td data-label={copy.table.device}>
            {row.device ? (
              <div className="sessions-device">
                <span className="sessions-device-main">
                  <DeviceIcon aria-hidden="true" />
                  {deviceLabel(row.device)}
                </span>
                {row.activeDeviceCount > 1 && <small className="sessions-device-count">{copy.device.signedInDevices.replace('{count}', String(row.activeDeviceCount))}</small>}
                {row.ipAddress && <small className="sessions-device-ip">{copy.device.ip.replace('{ip}', row.ipAddress)}</small>}
                {row.presence === 'offline' && row.hasSession && <small className="sessions-device-hint">{copy.device.lastDevice}</small>}
              </div>
            ) : <span className="sessions-muted">—</span>}
          </td>
          <td data-label={copy.table.status}>
            <span className="sessions-status">
              <span className={`sessions-status-dot is-${level}`} aria-hidden="true" />
              <span>{levelLabel}</span>
            </span>
          </td>
          <td data-label={copy.table.lastActivity}>
            {row.lastActivityAt
              ? <span className="sessions-activity-time">{formatDateTime(row.lastActivityAt, language)}</span>
              : <span className="sessions-muted">—</span>}
          </td>
        </tr>
      )
    })
  }

  return (
    <div className="users-table-wrap">
      <table className="users-table sessions-table">
        <thead>
          <tr>
            <th>{copy.table.user}</th>
            <th>{copy.table.company}</th>
            <th>{copy.table.email}</th>
            <th>{copy.table.department}</th>
            <th>{copy.table.role}</th>
            <th>{copy.table.device}</th>
            <th>{copy.table.status}</th>
            <th>{copy.table.lastActivity}</th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  )
}
