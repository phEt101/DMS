import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Language, Translations } from '../../../locales'
import type { ActivityFeatureCopy } from '../../../types/localization'
import { PaginationFooter } from '../../../components/pagination-footer'
import { listActivityLogs, type ActivityLog, type ActivityLogQuery } from './services/activityService'
import { useErrorToast } from '../../../components/toast-provider'

function describeClient(
  userAgent: string,
  activityTranslations: ActivityFeatureCopy,
): string {
  if (!userAgent) return activityTranslations.unknownClient

  const browser = [
    { pattern: /Edg\//, name: 'Microsoft Edge' },
    { pattern: /(?:Chrome|CriOS)\//, name: 'Chrome' },
    { pattern: /(?:Firefox|FxiOS)\//, name: 'Firefox' },
    { pattern: /Safari\//, name: 'Safari' },
  ].find(({ pattern }) => pattern.test(userAgent))?.name ?? 'Browser'
  const device = [
    { pattern: /iPhone/, name: 'iPhone' },
    { pattern: /iPad/, name: 'iPad' },
    { pattern: /Android/, name: 'Android' },
    { pattern: /Macintosh|Mac OS X/, name: 'macOS' },
    { pattern: /Windows/, name: 'Windows' },
    { pattern: /Linux/, name: 'Linux' },
  ].find(({ pattern }) => pattern.test(userAgent))?.name ?? activityTranslations.unknownClient

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

type Details = Record<string, unknown>
type DetailFormatter = (log: ActivityLog, copy: ActivityFeatureCopy) => string
type SettingsActivityPageProps = Readonly<{
  translations: Translations
  language: Language
}>

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return value.map(displayValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return '—'
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function changeRecords(details: Details): Details[] {
  if (!Array.isArray(details.changes)) return []
  return details.changes.filter((value): value is Details => Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as Details).field === 'string')
}

function namedAction(action: string, name: string, actions: Record<string, string>) {
  return [actions[action] ?? action, name].filter(Boolean).join(' ')
}

const formatLogin: DetailFormatter = (log, copy) => {
  const userAgent = log.details?.userAgent
  if (typeof userAgent !== 'string') return '—'
  return `${copy.loginFrom} ${describeClient(userAgent, copy)}`
}

const formatUser: DetailFormatter = (log, copy) => {
  const details = log.details!
  const name = typeof details.name === 'string' ? details.name : ''
  const prefix = copy.userActions[log.action] ?? log.action
  const records = changeRecords(details)
  if (records.length === 0 || log.action === 'activated' || log.action === 'deactivated') {
    return [prefix, name].filter(Boolean).join(' ')
  }
  const changes = records.map((change) => {
    const field = String(change.field)
    if (field === 'password') return copy.passwordChanged
    if (field === 'isActive') return booleanValue(change.to) ? copy.userActions.activated : copy.userActions.deactivated
    return `${copy.fields[field] ?? field}: ${copy.from} “${displayValue(change.from)}” ${copy.to} “${displayValue(change.to)}”`
  })
  if (log.action === 'updated') return [prefix, changes.join(' · ')].filter(Boolean).join(' ')
  return [`${prefix} ${name}`.trim(), ...changes].join(' · ')
}

const formatProject: DetailFormatter = (log, copy) => {
  const details = log.details!
  const name = typeof details.name === 'string' ? details.name : ''
  const parts = [namedAction(log.action, name, copy.projectActions)]
  if (log.action === 'created') {
    for (const field of ['projectTypeId', 'projectManagerName', 'customerName']) {
      if (field in details) parts.push(`${copy.projectFields[field] ?? field}: ${displayValue(details[field])}`)
    }
  }
  if (log.action === 'updated') {
    for (const change of changeRecords(details)) {
      const field = String(change.field)
      parts.push(`${copy.projectFields[field] ?? field}: ${copy.from} “${displayValue(change.from)}” ${copy.to} “${displayValue(change.to)}”`)
    }
  }
  return parts.filter(Boolean).join(' · ')
}

function surveyValue(field: string, value: unknown, copy: ActivityFeatureCopy) {
  const text = displayValue(value)
  if (!['status', 'visitType', 'fcpStatus'].includes(field)) return text
  return copy.surveyValues[text] ?? text
}

const formatSurvey: DetailFormatter = (log, copy) => {
  const details = log.details!
  const name = typeof details.name === 'string' ? details.name : ''
  const parts = [namedAction(log.action, name, copy.surveyActions)]
  if (log.action === 'created') {
    for (const field of ['status', 'surveyDate', 'contactName', 'province']) {
      if (field in details) parts.push(`${copy.surveyFields[field] ?? field}: ${surveyValue(field, details[field], copy)}`)
    }
  }
  if (log.action === 'updated') {
    for (const change of changeRecords(details)) {
      const field = String(change.field)
      parts.push(`${copy.surveyFields[field] ?? field}: ${copy.from} “${surveyValue(field, change.from, copy)}” ${copy.to} “${surveyValue(field, change.to, copy)}”`)
    }
  }
  return parts.filter(Boolean).join(' · ')
}

const formatRole: DetailFormatter = (log, copy) => {
  const details = log.details!
  const name = typeof details.name === 'string' ? details.name : ''
  const changedModules = Array.isArray(details.changedModules)
    ? details.changedModules.filter((module): module is string => typeof module === 'string')
    : []
  const legacyStatusOnly = log.action === 'updated' && typeof details.isActive === 'boolean' && changedModules.length === 0
  let action = log.action
  if (legacyStatusOnly) action = details.isActive ? 'activated' : 'deactivated'
  const parts = [namedAction(action, name, copy.roleActions)]
  if (changedModules.length > 0) {
    parts.push(`${copy.rolePermissionModules} ${changedModules.map((module) => copy.modules[module] ?? module).join(', ')}`)
  }
  if (!legacyStatusOnly && typeof details.isActive === 'boolean') {
    parts.push(details.isActive ? copy.roleActivated : copy.roleDeactivated)
  }
  return parts.filter(Boolean).join(' · ')
}

const formatCompany: DetailFormatter = (log, copy) => {
  const name = typeof log.details?.name === 'string' ? log.details.name : ''
  return namedAction(log.action, name, copy.companyActions)
}

const formatDocument: DetailFormatter = (log, copy) => {
  const details = log.details!
  const parts = [copy.documentActions[log.action] ?? log.action]
  if (typeof details.requestNo === 'string') parts.push(`${copy.requestNumber}: ${details.requestNo}`)
  if (typeof details.kind === 'string') parts.push(`${copy.documentType}: ${copy.documentKinds[details.kind] ?? details.kind}`)
  if (typeof details.status === 'string') parts.push(`${copy.status}: ${copy.documentStatuses[details.status] ?? details.status}`)
  if (typeof details.stage === 'string') parts.push(`${copy.approvalStage}: ${copy.approvalStages[details.stage] ?? details.stage}`)
  return parts.join(' · ')
}

const formatLeavePolicy: DetailFormatter = (log, copy) => {
  const details = log.details!
  const parts = [copy.documentActions[log.action] ?? log.action]
  if (typeof details.year === 'number') parts.push(String(details.year))
  for (const change of changeRecords(details)) {
    const field = String(change.field)
    parts.push(`${copy.policyFields[field] ?? field}: ${copy.from} “${displayValue(change.from)}” ${copy.to} “${displayValue(change.to)}”`)
  }
  return parts.join(' · ')
}

const formatAccessEntity: DetailFormatter = (log, copy) => {
  const details = log.details!
  const name = typeof details.name === 'string' ? details.name : ''
  let actions = copy.moduleActions
  if (log.entityType === 'department') actions = copy.departmentActions
  if (log.entityType === 'permission') actions = copy.permissionActions
  const prefix = actions[log.action] ?? log.action
  const records = changeRecords(details)
  if (records.length === 0 || log.action === 'activated' || log.action === 'deactivated') {
    return [prefix, name].filter(Boolean).join(' ')
  }
  const changes = records.map((change) => {
    const field = String(change.field)
    if (field === 'isActive') return booleanValue(change.to) ? actions.activated : actions.deactivated
    const from = field === 'module' && typeof change.from === 'string' ? copy.modules[change.from] ?? change.from : displayValue(change.from)
    const to = field === 'module' && typeof change.to === 'string' ? copy.modules[change.to] ?? change.to : displayValue(change.to)
    return `${copy.fields[field] ?? field}: ${copy.from} “${from}” ${copy.to} “${to}”`
  })
  return [[prefix, name].filter(Boolean).join(' '), ...changes].filter(Boolean).join(' · ')
}

const formatGeneric: DetailFormatter = (log, copy) => {
  const details = log.details!
  const parts: string[] = []
  if (typeof details.name === 'string' && details.name) parts.push(details.name)
  if (typeof details.module === 'string') parts.push(`${copy.module}: ${copy.modules[details.module] ?? details.module}`)
  if (typeof details.permissionCount === 'number') parts.push(`${copy.permissionCount}: ${details.permissionCount}`)
  if (Array.isArray(details.changedFields)) {
    const fields = details.changedFields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => copy.fields[field] ?? field)
    if (fields.length > 0) parts.push(`${copy.changedFields}: ${fields.join(', ')}`)
  }
  return parts.join(' · ') || '—'
}

function formatDetails(
  log: ActivityLog,
  activityTranslations: ActivityFeatureCopy,
): string {
  if (!log.details) return '—'
  if (log.action === 'login') return formatLogin(log, activityTranslations)
  const formatters: Record<string, DetailFormatter> = {
    user: formatUser,
    project: formatProject,
    survey: formatSurvey,
    role: formatRole,
    company: formatCompany,
    employee_request: formatDocument,
    leave_policy: formatLeavePolicy,
    department: formatAccessEntity,
    permission: formatAccessEntity,
    module: formatAccessEntity,
  }
  return (formatters[log.entityType] ?? formatGeneric)(log, activityTranslations)
}

function actionBadgeClass(action: string) {
  if (action === 'login') return 'is-login'
  if (action === 'logout') return 'is-logout'
  return ''
}

export default function SettingsActivityPage({
  translations,
  language,
}: SettingsActivityPageProps) {
  const activityTranslations: ActivityFeatureCopy = translations.features.settingsActivity
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // ตัวกรอง: ค้นหาชื่อ/อีเมล, โมดูล, การกระทำ, ช่วงวันที่ — กรองทันทีเมื่อเลือก/พิมพ์ (debounce สำหรับช่องค้นหา)
  const emptyQuery: ActivityLogQuery = { search: '', module: '', action: '', from: '', to: '' }
  const [query, setQuery] = useState<ActivityLogQuery>(emptyQuery)
  const [searchInput, setSearchInput] = useState('')
  useErrorToast(error)

  // debounce ช่องค้นหา 400ms เพื่อไม่ให้ยิง request ทุกคีย์
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }))
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await listActivityLogs(page, pageSize, query)
      setLogs(response.data)
      setTotal(response.meta.total)
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : activityTranslations.loadError)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, query, activityTranslations.loadError])

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
    submitted: activityTranslations.submitted,
    approved: activityTranslations.approved,
    rejected: activityTranslations.rejected,
    cancelled: activityTranslations.cancelled,
    policy_updated: activityTranslations.policyUpdated,
  }

  const resetFilters = () => { setSearchInput(''); setQuery(emptyQuery); setPage(1) }
  const moduleOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => resolveActivityModule(log))
      .filter((module): module is string => typeof module === 'string' && module.length > 0)))
      .sort((left, right) => left.localeCompare(right)),
    [logs],
  )
  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort((left, right) => left.localeCompare(right)),
    [logs],
  )
  const hasFilters = Object.values(query).some(Boolean)
  let tableRows
  if (loading) {
    tableRows = <tr><td className="table-message" colSpan={8}>{activityTranslations.loading}</td></tr>
  } else if (logs.length === 0) {
    tableRows = <tr><td className="table-message" colSpan={8}>{activityTranslations.empty}</td></tr>
  } else {
    tableRows = logs.map((log, index) => {
      const activityModule = resolveActivityModule(log)
      return (
        <tr key={log.id}>
          <td data-label={activityTranslations.sequence}>{(page - 1) * pageSize + index + 1}</td>
          <td data-label={activityTranslations.user}><strong>{log.userName ?? activityTranslations.unknownUser}</strong></td>
          <td data-label={activityTranslations.email}>{log.userEmail ?? '—'}</td>
          <td data-label={activityTranslations.activity}>
            <span className={`activity-badge ${actionBadgeClass(log.action)}`}>
              {actionLabels[log.action] ?? log.action}
            </span>
          </td>
          <td data-label={activityTranslations.module}>
            {activityTranslations.modules[activityModule ?? ''] ?? activityModule ?? '—'}
          </td>
          <td className="activity-details" data-label={activityTranslations.details}>{formatDetails(log, activityTranslations)}</td>
          <td data-label={activityTranslations.ipAddress}>{log.ipAddress ?? '—'}</td>
          <td data-label={activityTranslations.dateTime}>{dateFormatter.format(new Date(log.createdAt))}</td>
        </tr>
      )
    })
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

      <div className="activity-filter-panel">
        <div className="activity-filter-row activity-filter-row--search">
          <div className="activity-search-field">
            <svg className="activity-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 4a6 6 0 1 0 3.874 10.577l4.274 4.275a1 1 0 0 0 1.415-1.414l-4.275-4.275A6 6 0 0 0 10 4Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" fill="currentColor"/>
            </svg>
            <input
              className="users-filter-search"
              aria-label={activityTranslations.search}
              placeholder={activityTranslations.search}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <span className="activity-filter-count">
            <strong>{total.toLocaleString()}</strong>&nbsp;{activityTranslations.records.replace('{count}', '').trim()}
          </span>
        </div>
        <div className="activity-filter-row">
          <select className="users-filter-status" aria-label={activityTranslations.module} value={query.module ?? ''} onChange={(event) => { setQuery({ ...query, module: event.target.value }); setPage(1) }}>
            <option value="">{activityTranslations.allModules}</option>
            {moduleOptions.map((module) => (
              <option key={module} value={module}>{activityTranslations.modules[module] ?? module}</option>
            ))}
          </select>
          <select className="users-filter-role" aria-label={activityTranslations.activity} value={query.action ?? ''} onChange={(event) => { setQuery({ ...query, action: event.target.value }); setPage(1) }}>
            <option value="">{activityTranslations.allActions}</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{actionLabels[action] ?? action}</option>
            ))}
          </select>
          <label className="activity-filter-date">
            <span>{activityTranslations.fromDate}</span>
            <input type="date" value={query.from ?? ''} onChange={(event) => { setQuery({ ...query, from: event.target.value }); setPage(1) }} />
          </label>
          <label className="activity-filter-date">
            <span>{activityTranslations.toDate}</span>
            <input type="date" value={query.to ?? ''} onChange={(event) => { setQuery({ ...query, to: event.target.value }); setPage(1) }} />
          </label>
          {hasFilters && (
            <button type="button" className="activity-clear-button" onClick={resetFilters}>
              <span aria-hidden="true">✕</span> {activityTranslations.clearFilters}
            </button>
          )}
        </div>
      </div>

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
          <tbody>{tableRows}</tbody>
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
