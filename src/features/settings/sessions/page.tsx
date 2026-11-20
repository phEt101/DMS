import { useCallback, useEffect, useRef, useState } from 'react'
import { FaRotateRight } from 'react-icons/fa6'

import { PaginationFooter } from '../../../components/pagination-footer'
import { useErrorToast } from '../../../components/toast-provider'
import type { Language, Translations } from '../../../locales'
import { useAuth } from '../../auth/hooks/use-auth'
import { SessionsPresence } from './components/sessions-presence'
import { SessionsTable } from './components/sessions-table'
import { SessionsToolbar } from './components/sessions-toolbar'
import { formatUpdatedTime } from './sessions-format'
import {
  listSessions,
  type PresenceFilter,
  type PresenceStatus,
  type SessionUserRow,
  type SessionsFilterOptions,
  type SessionsSummary,
} from './services/sessions.service'

const EMPTY_SUMMARY: SessionsSummary = { active: 0, idle: 0, offline: 0, online: 0, total: 0 }
const EMPTY_FILTERS: SessionsFilterOptions = { departments: [], roles: [] }
const AUTO_REFRESH_MS = 30_000

export default function SettingsSessionsPage({
  translations,
  language,
}: {
  translations: Translations
  language: Language
}) {
  const copy = translations.features.settingsSessions
  const { user } = useAuth()
  const companyId = user?.company?.id ?? 0

  const [rows, setRows] = useState<SessionUserRow[]>([])
  const [summary, setSummary] = useState<SessionsSummary>(EMPTY_SUMMARY)
  const [filterOptions, setFilterOptions] = useState<SessionsFilterOptions>(EMPTY_FILTERS)
  const [status, setStatus] = useState<PresenceFilter>('online')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('all')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const requestIdRef = useRef(0)
  useErrorToast(error)

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const requestId = ++requestIdRef.current
    if (options.silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await listSessions({ status, search, departmentId, role, page, limit: pageSize })
      if (requestId !== requestIdRef.current) return
      setRows(response.data)
      setSummary(response.summary)
      setFilterOptions(response.filters)
      setTotal(response.pagination.total)
      setUpdatedAt(response.generatedAt)
    } catch (caught) {
      if (requestId !== requestIdRef.current) return
      setError(caught instanceof Error ? caught.message : copy.loadError)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [copy.loadError, departmentId, page, pageSize, role, search, status])

  useEffect(() => {
    void load()
  }, [load, companyId])

  // ค้นหาแบบหน่วงเวลา 300ms เพื่อไม่ให้ยิง request ทุกคีย์
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  // อัปเดตสถานะออนไลน์อัตโนมัติทุก 30 วินาที ขณะที่แท็บยังมองเห็นอยู่
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }, AUTO_REFRESH_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [load])

  const showStatus = (next: PresenceStatus) => {
    setStatus(next)
    setPage(1)
  }
  const showOverallStatus = (next: PresenceFilter) => {
    setStatus(next)
    setPage(1)
  }

  return (
    <section className="feature-page feature-page--wide sessions-page">
      <header className="users-header sessions-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p className="users-header-description">{copy.subtitle}</p>
        </div>
        <div className="sessions-header-actions">
          <button
            type="button"
            className="secondary-button sessions-refresh"
            onClick={() => void load({ silent: true })}
            disabled={refreshing}
          >
            <FaRotateRight aria-hidden="true" className={refreshing ? 'is-spinning' : undefined} />
            {refreshing ? copy.refreshing : copy.refresh}
          </button>
          {updatedAt && (
            <span className="sessions-updated">{copy.updatedAt.replace('{time}', formatUpdatedTime(updatedAt, language))}</span>
          )}
        </div>
      </header>

      <SessionsPresence
        summary={summary}
        status={status}
        copy={copy}
        onStatusChange={showStatus}
        onShowOnline={() => showOverallStatus('online')}
        onShowAll={() => showOverallStatus('all')}
      />

      <SessionsToolbar
        searchInput={searchInput}
        departmentId={departmentId}
        role={role}
        filterOptions={filterOptions}
        total={total}
        copy={copy}
        onSearch={setSearchInput}
        onDepartment={(value) => { setDepartmentId(value); setPage(1) }}
        onRole={(value) => { setRole(value); setPage(1) }}
      />

      <SessionsTable
        rows={rows}
        loading={loading}
        error={error}
        status={status}
        copy={copy}
        language={language}
        onRetry={() => void load()}
        onSwitchStatus={showOverallStatus}
      />

      {total > 0 && (
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
      )}
    </section>
  )
}
