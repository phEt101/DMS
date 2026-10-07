import { useEffect, useMemo, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import SurveyForm from './components/survey-form'
import SurveyDetail from './components/survey-detail'
import type { Survey } from './types'
import { loadSurveys, deleteSurvey } from './storage'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import { PaginationFooter } from '../../../components/pagination-footer'

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>(() => loadSurveys())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Survey | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSurvey, setDetailSurvey] = useState<Survey | null>(null)

  // list controls (search / filter / pagination)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "submitted">("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => { setSurveys(loadSurveys()) }, [])

  const handleSaved = (s: Survey) => {
    setSurveys((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = s; return copy }
      return [s, ...prev]
    })
  }

  // derived filtered list
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return surveys.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false
      if (!term) return true
      return (s.projectName || '').toLowerCase().includes(term)
    })
  }, [surveys, search, statusFilter])

  const total = filtered.length
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const pageSafe = Math.max(1, Math.min(page, totalPages))
  const pageStart = (pageSafe - 1) * pageSize
  const pageItems = filtered.slice(pageStart, pageStart + pageSize)

  return (
    <section className="feature-page">
      <div className="dms-title-row">
        <div className="dms-title-block"><h1>Fire Alarm Survey</h1><div className="dms-subtitle">Field technician checklist</div></div>
        <div className="dms-title-search-row"><div className="dms-create-actions"><button className="dms-create-btn" onClick={() => { setEditing(null); setModalOpen(true) }}>New Survey</button></div></div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="dms-title-search-row">
          <div className="dms-search-wrap">
            <FaMagnifyingGlass className="dms-search-icon" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="ค้นหา ชื่อโครงการ" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1) }} className="dms-filter-select-trigger">
              <option value="">สถานะทั้งหมด</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
            <div className="dms-stats-group">
              <div className="dms-stats-pill">{total} records</div>
            </div>
          </div>
        </div>

        {total === 0 ? (
          <div className="dms-project-empty"><div>No surveys found</div></div>
        ) : (
          <div className="dms-card-grid">
            {pageItems.map((s) => (
              <article
                key={s.id}
                className={`dms-project-card ${s.status === 'draft' ? '' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => { setDetailSurvey(s); setDetailOpen(true) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailSurvey(s); setDetailOpen(true) } }}
              >
                <div className="dms-card-head">
                  <div className="dms-project-icon-pill">🔎</div>
                  <div className="dms-project-actions">
                    <span className={`dms-card-status is-${s.status}`}>{s.status}</span>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                      <button className="dms-tool-btn" onClick={(e) => { e.stopPropagation(); setEditing(s); setModalOpen(true) }}>แก้ไข</button>
                      <button className="dms-tool-btn is-danger" onClick={(e) => { e.stopPropagation(); if (confirm('Delete survey?')) { deleteSurvey(s.id); setSurveys(loadSurveys()) } }}>ลบ</button>
                    </div>
                  </div>
                </div>
                <h3 className="dms-card-name">{s.projectName || '(no name)'}</h3>
                <div className="dms-card-foot">
                  <div>
                    <div className="dms-card-meta"><span className="dms-card-date">{s.surveyDate}</span></div>
                    <div style={{ marginTop: 6 }}>{s.province || '-'}</div>
                  </div>
                  <div className="dms-card-meta">
                    <div>{s.fcpBrand ? `${s.fcpBrand} ${s.fcpModel || ''}` : '-'}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {total > 0 && (
          <PaginationFooter
            page={pageSafe}
            pageSize={pageSize}
            total={total}
            labels={{ previous: 'Previous', next: 'Next', page: 'Page', perPage: 'per page' }}
            onPageChange={(p: number) => setPage(Math.max(1, Math.min(p, totalPages)))}
            onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }}
          />
        )}
      </div>

      <RadixDialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="modal-backdrop" />
          <RadixDialog.Content className="dms-modal dms-create-doc-modal">
            <RadixDialog.Title className="dms-modal-title">Survey</RadixDialog.Title>
            <RadixDialog.Description className="dms-modal-subtitle">Fire Alarm Checklist</RadixDialog.Description>
            <RadixDialog.Close asChild>
              <button className="modal-close" aria-label="Close">×</button>
            </RadixDialog.Close>
            <div className="dms-create-doc-body">
              <SurveyForm initial={editing ?? undefined} onSaved={(s) => { handleSaved(s); setModalOpen(false) }} onClose={() => setModalOpen(false)} />
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <RadixDialog.Root open={detailOpen} onOpenChange={setDetailOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="modal-backdrop" />
          <RadixDialog.Content className="dms-modal dms-create-doc-modal">
            <RadixDialog.Title className="dms-modal-title">Survey Detail</RadixDialog.Title>
            <RadixDialog.Description className="dms-modal-subtitle">Read-only view</RadixDialog.Description>
            <RadixDialog.Close asChild>
              <button className="modal-close" aria-label="Close">×</button>
            </RadixDialog.Close>
            <div className="dms-create-doc-body">
              {detailSurvey ? <SurveyDetail survey={detailSurvey} onClose={() => setDetailOpen(false)} onEdit={(s) => { setDetailOpen(false); setEditing(s); setModalOpen(true) }} /> : <div>Loading...</div>}
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </section>
  )
}
