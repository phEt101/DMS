import { useCallback, useEffect, useState } from 'react'

import type { Language, Translations } from '../../../locales'
import type { ActivityFeatureCopy } from '../../../types/localization'
import { PaginationFooter } from '../../../components/pagination-footer'
import { listActivityLogs, type ActivityLog } from './services/activityService'
import { useErrorToast } from '../../../components/toast-provider'

function describeClient(
  userAgent: string,
  activityTranslations: ActivityFeatureCopy,
): string {
  if (!userAgent) return activityTranslations.unknownClient

  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /(?:Chrome|CriOS)\//.test(userAgent)
      ? "Chrome"
      : /(?:Firefox|FxiOS)\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser"
  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Macintosh|Mac OS X/.test(userAgent)
          ? "macOS"
          : /Windows/.test(userAgent)
            ? "Windows"
            : /Linux/.test(userAgent)
              ? "Linux"
              : activityTranslations.unknownClient

  return browser + " " + activityTranslations.onDevice + " " + device
}

function resolveActivityModule(log: ActivityLog): string | null {
  if (log.module !== 'users') return log.module

  const legacyModules: Record<string, string> = {
    role: 'roles',
    department: 'departments',
    permission: 'permissions',
    module: 'modules',
  }

  return legacyModules[log.entityType ?? ''] ?? log.module
}

function formatDetails(
  log: ActivityLog,
  activityTranslations: ActivityFeatureCopy,
): string {
  if (!log.details) return '—'

  if (log.action === 'login' && typeof log.details.userAgent === 'string') {
    return activityTranslations.loginFrom + " " + describeClient(log.details.userAgent, activityTranslations)
  }

  const name = typeof log.details.name === 'string' ? log.details.name : ''

  if (log.entityType === 'user') {
    const prefix = activityTranslations.userActions[log.action] ?? log.action
    if (!Array.isArray(log.details.changes)) {
      return [prefix, name].filter(Boolean).join(' ')
    }

    if (log.action === 'activated' || log.action === 'deactivated') {
      return [prefix, name].filter(Boolean).join(' ')
    }

    const changes = log.details.changes.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return []
      const change = value as Record<string, unknown>
      if (typeof change.field !== 'string') return []
      if (change.field === 'password') return [activityTranslations.passwordChanged]
      if (change.field === 'isActive') {
        return [Boolean(change.to)
          ? activityTranslations.userActions.activated
          : activityTranslations.userActions.deactivated]
      }

      const displayValue = (item: unknown) => {
        return item === null || item === undefined || item === '' ? '—' : String(item)
      }

      return [
        `${activityTranslations.from} “${displayValue(change.from)}” ${activityTranslations.to} “${displayValue(change.to)}”`,
      ]
    })

    if (log.action === 'updated') {
      return [prefix, changes.join(' · ')].filter(Boolean).join(' ')
    }
    return [`${prefix} ${name}`.trim(), ...changes].join(' · ')
  }

  if (log.entityType === 'role') {
    const hasChangedModules = Array.isArray(log.details.changedModules)
      && log.details.changedModules.length > 0
    const isLegacyStatusOnly = log.action === 'updated'
      && typeof log.details.isActive === 'boolean'
      && !hasChangedModules
    const action = isLegacyStatusOnly
      ? log.details.isActive ? 'activated' : 'deactivated'
      : log.action
    const prefix = activityTranslations.roleActions[action] ?? action
    const parts = [[prefix, name].filter(Boolean).join(' ')]

    if (Array.isArray(log.details.changedModules)) {
      const modules = log.details.changedModules
        .filter((module): module is string => typeof module === 'string')
        .map((module) => activityTranslations.modules[module] ?? module)
      if (modules.length > 0) {
        parts.push(`${activityTranslations.rolePermissionModules} ${modules.join(', ')}`)
      }
    }

    if (!isLegacyStatusOnly && typeof log.details.isActive === 'boolean') {
      parts.push(log.details.isActive ? activityTranslations.roleActivated : activityTranslations.roleDeactivated)
    }

    return parts.filter(Boolean).join(' · ')
  }

  if (log.entityType === 'department' || log.entityType === 'permission' || log.entityType === 'module') {
    const actions = log.entityType === 'department'
      ? activityTranslations.departmentActions
      : log.entityType === 'permission'
        ? activityTranslations.permissionActions
        : activityTranslations.moduleActions
    const prefix = actions[log.action] ?? log.action
    if (!Array.isArray(log.details.changes)
      || log.action === 'activated'
      || log.action === 'deactivated') {
      return [prefix, name].filter(Boolean).join(' ')
    }

    const changes = log.details.changes.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return []
      const change = value as Record<string, unknown>
      if (typeof change.field !== 'string') return []
      if (change.field === 'isActive') {
        return [Boolean(change.to) ? actions.activated : actions.deactivated]
      }

      const displayValue = (item: unknown) => {
        if (change.field === 'module' && typeof item === 'string') {
          return activityTranslations.modules[item] ?? item
        }
        return item === null || item === undefined || item === '' ? '—' : String(item)
      }

      return [`${activityTranslations.from} “${displayValue(change.from)}” ${activityTranslations.to} “${displayValue(change.to)}”`]
    })

    return [[prefix, name].filter(Boolean).join(' '), ...changes]
      .filter(Boolean)
      .join(' · ')
  }

  const parts: string[] = []
  if (name) parts.push(name)
  if (typeof log.details.module === 'string') {
    parts.push(`${activityTranslations.module}: ${activityTranslations.modules[log.details.module] ?? log.details.module}`)
  }
  if (typeof log.details.permissionCount === 'number') {
    parts.push(`${activityTranslations.permissionCount}: ${log.details.permissionCount}`)
  }
  if (Array.isArray(log.details.changedFields)) {
    const fields = log.details.changedFields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => activityTranslations.fields[field] ?? field)
    if (fields.length > 0) parts.push(`${activityTranslations.changedFields}: ${fields.join(', ')}`)
  }

  return parts.join(' · ') || '—'
}

export default function SettingsActivityPage({
  translations,
  language,
}: {
  translations: Translations
  language: Language
}) {
  const activityTranslations: ActivityFeatureCopy = translations.features.settingsActivity
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useErrorToast(error)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await listActivityLogs(page, pageSize)
      setLogs(response.data)
      setTotal(response.meta.total)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : activityTranslations.loadError)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, activityTranslations.loadError])

  useEffect(() => {
    void load()
  }, [load])

  const dateFormatter = new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const actionLabels: Record<string, string> = {
    login: activityTranslations.login,
    logout: activityTranslations.logout,
    created: activityTranslations.created,
    updated: activityTranslations.updated,
    deleted: activityTranslations.deleted,
    activated: activityTranslations.activated,
    deactivated: activityTranslations.deactivated,
  }

  return (
    <section className="feature-page feature-page--wide activity-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{activityTranslations.kicker}</p>
          <h1>{activityTranslations.title}</h1>
          <p>{activityTranslations.subtitle}</p>
        </div>
      </header>

      <div className="users-table-wrap">
        <table className="users-table activity-table">
          <thead>
            <tr>
              <th>{activityTranslations.sequence}</th>
              <th>{activityTranslations.user}</th>
              <th>{activityTranslations.email}</th>
              <th>{activityTranslations.activity}</th>
              <th>{activityTranslations.module}</th>
              <th>{activityTranslations.details}</th>
              <th>{activityTranslations.ipAddress}</th>
              <th>{activityTranslations.dateTime}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="table-message" colSpan={8}>{activityTranslations.loading}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td className="table-message" colSpan={8}>{activityTranslations.empty}</td></tr>
            ) : (
              logs.map((log, index) => (
                <tr key={log.id}>
                  <td data-label={activityTranslations.sequence}>{(page - 1) * pageSize + index + 1}</td>
                  <td data-label={activityTranslations.user}><strong>{log.userName ?? activityTranslations.unknownUser}</strong></td>
                  <td data-label={activityTranslations.email}>{log.userEmail ?? '—'}</td>
                  <td data-label={activityTranslations.activity}>
                    <span className={`activity-badge ${log.action === 'login' ? 'is-login' : log.action === 'logout' ? 'is-logout' : ''}`}>
                      {actionLabels[log.action] ?? log.action}
                    </span>
                  </td>
                  <td data-label={activityTranslations.module}>
                    {activityTranslations.modules[resolveActivityModule(log) ?? ''] ?? resolveActivityModule(log) ?? '—'}
                  </td>
                  <td className="activity-details" data-label={activityTranslations.details}>{formatDetails(log, activityTranslations)}</td>
                  <td data-label={activityTranslations.ipAddress}>{log.ipAddress ?? '—'}</td>
                  <td data-label={activityTranslations.dateTime}>{dateFormatter.format(new Date(log.createdAt))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={total}
        labels={translations.common.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </section>
  )
}
