import { useState } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { FaFilter, FaList, FaTableCellsLarge, FaMagnifyingGlass } from 'react-icons/fa6'

export type SurveyStatusFilter = '' | 'draft' | 'submitted'

export default function SurveyFilter({
  search,
  statusFilter,
  total,
  onSearchChange,
  onStatusChange,
  viewMode,
  onViewModeChange,
  translations,
  language,
}: {
  search: string
  statusFilter: SurveyStatusFilter
  total: number
  onSearchChange: (value: string) => void
  onStatusChange: (value: SurveyStatusFilter) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  translations?: any
  language?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<SurveyStatusFilter>(statusFilter)

  const activeCount = draftStatus ? 1 : 0
  const t = translations?.features?.survey ?? {}

  return (
    <div className="dms-filter-wrap" style={{ marginBottom: 12 }}>
      <div className="dms-survey-filter-row">
        <div className="dms-search-wrap">
          <FaMagnifyingGlass className="dms-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder ?? 'Search project name'}
          />
        </div>

        <div className="dms-survey-filter-tools">
          <div style={{ display: 'inline-flex', gap: 6, padding: 6, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <button
              type="button"
              className={`dms-tool-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
            >
              <FaTableCellsLarge />
            </button>
            <button
              type="button"
              className={`dms-tool-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
            >
              <FaList />
            </button>
          </div>

          <button
            type="button"
            className={`dms-tool-btn ${draftStatus ? 'is-active' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="survey-filter-panel"
          >
            <FaFilter /> {t.filter?.label ?? 'Filter'}{draftStatus ? ` (${activeCount})` : ''}
          </button>

          <div className="dms-stats-group">
            <div className="dms-stats-pill">{(t.records ?? '{count} records').replace('{count}', String(total))}</div>
          </div>
        </div>
      </div>

      {open && (
        <form
          id="survey-filter-panel"
          className="dms-filter-panel"
          onSubmit={(e) => { e.preventDefault(); onStatusChange(draftStatus); setOpen(false) }}
          style={{ marginTop: 8 }}
        >
          <label className="dms-filter-field">
            <span>{t.filter?.statusLabel ?? 'Status'}</span>
            <RadixSelect.Root value={draftStatus || 'all'} onValueChange={(v) => setDraftStatus(v === 'all' ? '' : (v as SurveyStatusFilter))}>
              <RadixSelect.Trigger className="radix-pagination-trigger dms-filter-select-trigger" aria-label={t.filter?.statusLabel ?? 'Status'}>
                <RadixSelect.Value />
                <RadixSelect.Icon className="radix-pagination-icon" aria-hidden>⌄</RadixSelect.Icon>
              </RadixSelect.Trigger>
              <RadixSelect.Portal>
                <RadixSelect.Content className="radix-pagination-content dms-filter-select-content" position="popper" sideOffset={6} align="start">
                  <RadixSelect.Viewport className="radix-pagination-viewport">
                    {[
                      { value: 'all', label: t.filter?.status?.all ?? 'All statuses' },
                      { value: 'draft', label: t.status?.draft ?? 'Draft' },
                      { value: 'submitted', label: t.status?.submitted ?? 'Submitted' },
                    ].map((opt) => (
                      <RadixSelect.Item key={opt.value} value={opt.value} className="radix-pagination-item">
                        <RadixSelect.ItemIndicator className="radix-pagination-item-indicator">✓</RadixSelect.ItemIndicator>
                        <RadixSelect.ItemText className="radix-pagination-item-text">{opt.label}</RadixSelect.ItemText>
                      </RadixSelect.Item>
                    ))}
                  </RadixSelect.Viewport>
                </RadixSelect.Content>
              </RadixSelect.Portal>
            </RadixSelect.Root>
          </label>

          <div className="dms-filter-actions">
            <button
              type="button"
              className="dms-filter-reset"
              onClick={() => { setDraftStatus(''); onStatusChange(''); setOpen(false) }}
            >
              {t.filter?.clear ?? 'Clear'}
            </button>
            <button type="submit" className="dms-filter-apply">{t.filter?.apply ?? 'Apply'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
