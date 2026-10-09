import React, { useEffect, useMemo, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import SurveyForm from './components/survey-form'
import SurveyDetail from './components/survey-detail'
import SurveyFilter, { type SurveyStatusFilter } from './components/survey-filter'
import type { Survey } from './types'
import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import {
  listSurveys as apiListSurveys,
  deleteSurveyApi,
  getSurvey,
} from '../../../services/surveys.api'
import { PaginationFooter } from '../../../components/pagination-footer'
import ConfirmDialog from '../../../components/confirm-dialog'
import { useToast } from '../../../components/toast-provider'
import { FaEllipsis, FaFileLines, FaPen, FaTrashCan } from 'react-icons/fa6'

/** แปลงเฉพาะวันที่ เช่น 2026-10-08 -> 08/10/2569 (ไม่มีค่า = คืนสตริงว่าง) */
function formatThaiDate(value?: string | Date | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

const FILE_URL = (id: unknown) => `/boswell-api/v1/surveys/files/${id}`

/** Map API response (list + detail) -> Survey */
function mapSurvey(r: any): Survey {
  const loc = r.location
  return {
    id: String(r.id),
    surveyNo: r.surveyNo ?? r.survey_no ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
    status: r.status,
    surveyDate: r.surveyDate ?? r.survey_date ?? '',
    projectName: r.projectName ?? r.project_name ?? '',
    province: r.province ?? loc?.province ?? loc?.province_name ?? undefined,
    district: r.district ?? loc?.district ?? loc?.district_name ?? undefined,
    subdistrict: r.subdistrict ?? loc?.subdistrict ?? loc?.subdistrict_name ?? undefined,
    floors: r.floors ?? undefined,
    contacts: Array.isArray(r.contacts) ? r.contacts : undefined,
    contact1: r.contact1 ?? r.contacts?.[0] ?? undefined,
    contact2: r.contact2 ?? r.contacts?.[1] ?? undefined,
    visitType: r.visitType ?? r.visit_type ?? '',
    signPhoto: r.signPhoto ?? (r.sign_photo_file_id ? FILE_URL(r.sign_photo_file_id) : null),
    fcpBrand: r.fcpBrand ?? r.fcp?.brand ?? null,
    fcpModel: r.fcpModel ?? r.fcp?.model ?? null,
    fcpType: r.fcpType ?? r.fcp?.type ?? r.fcp?.panel_type ?? null,
    fcpMaterial: r.fcpMaterial ?? r.fcp?.material ?? r.fcp?.cabinet_material ?? null,
    fcpStatus: r.fcpStatus ?? r.fcp?.status ?? r.fcp?.power_status ?? '',
    fcpOverview: r.fcpOverview ?? (r.fcp?.overview_file_id ? FILE_URL(r.fcp.overview_file_id) : null),
    fcpNameplate: r.fcpNameplate ?? (r.fcp?.nameplate_file_id ? FILE_URL(r.fcp.nameplate_file_id) : null),
    fcpInside: r.fcpInside ?? (r.fcp?.inside_file_id ? FILE_URL(r.fcp.inside_file_id) : null),
    equipment: (r.equipment || []).map((eq: any) => {
      const flag = eq.isPresent ?? eq.is_present
      const isPresent = flag === true || flag === 1 || flag === '1' || flag === 'true' || eq.status === 'yes'
      const equipmentTypeId = eq.equipmentTypeId ?? eq.equipment_type_id
      const typeName = eq.type_name ?? eq.typeName ?? undefined
      const customName = eq.customName ?? eq.custom_name ?? undefined
      return {
        id: eq.id ? String(eq.id) : undefined,
        equipmentTypeId: equipmentTypeId ? String(equipmentTypeId) : undefined,
        typeName,
        customName,
        isPresent,
        // detail + form ใช้ status ('yes' | 'no') จึงต้อง map จาก isPresent ด้วย
        status: isPresent ? 'yes' : 'no',
        // ชื่อ: name -> custom name -> ชื่อประเภทอุปกรณ์จาก DB
        name: eq.name ?? customName ?? typeName ?? undefined,
        model: eq.model ?? undefined,
        qty: eq.qty ?? eq.quantity ?? undefined,
        photo: eq.photo ?? (eq.photo_file_id ? FILE_URL(eq.photo_file_id) : null),
      }
    }) as any,
    notes: r.notes ?? '',
    location: loc
      ? {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address ?? loc.address_line ?? null,
          province: loc.province ?? loc.province_name ?? null,
          district: loc.district ?? loc.district_name ?? null,
          subdistrict: loc.subdistrict ?? loc.subdistrict_name ?? null,
          postalCode: loc.postalCode ?? loc.postal_code ?? null,
          postalCodeId: loc.postalCodeId ?? loc.postal_code_id ?? null,
          country: loc.country ?? loc.country_code ?? 'TH',
        }
      : undefined,
  } as Survey
}

class ErrorBoundary extends React.Component<any, { error: Error | null, info?: any }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: any) {
    // log to console and keep UI from being blank
    console.error('Unhandled error in SurveyPage:', error, info)
    this.setState({ error, info })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2>เกิดข้อผิดพลาดขณะโหลดหน้า</h2>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#fff6f6', padding: 12, borderRadius: 8, border: '1px solid #f5c2c7' }}>
            {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Survey | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSurvey, setDetailSurvey] = useState<Survey | null>(null)

  // list controls
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')

  const reload = async () => {
    const res: any = await apiListSurveys()
    if (Array.isArray(res)) setSurveys(res.map(mapSurvey))
  }

  /** Load survey list */
  useEffect(() => {
    let mounted = true
    apiListSurveys().then(
      (res: any) => {
        if (mounted && Array.isArray(res)) setSurveys(res.map(mapSurvey))
      },
      (err) => {
        console.error('listSurveys failed', err)
        if (mounted) setSurveys([])
      }
    )
    return () => { mounted = false }
  }, [])

  /** Refresh list after save */
  const handleSaved = (_s: Survey) => {
    reload().catch((e) => console.error('refresh after save failed', e))
  }

  /** Search + filter */
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

  const handleSearchChange = (value: string) => { setSearch(value); setPage(1) }
  const handleStatusChange = (value: SurveyStatusFilter) => { setStatusFilter(value); setPage(1) }

  /** Open survey detail */
  async function openDetailById(id: string) {
    try {
      const res: any = await getSurvey(id)
      if (!res) { alert('Survey not found'); return }
      setDetailSurvey(mapSurvey(res))
      setDetailOpen(true)
    } catch (e) {
      console.error('fetch detail failed', e)
      alert('Failed to load survey detail')
    }
  }

  /** Open survey for editing */
  async function openEditById(id: string) {
    try {
      const res: any = await getSurvey(id)
      if (!res) { alert('Survey not found'); return }
      setEditing(mapSurvey(res))
      setModalOpen(true)
    } catch (err) {
      console.error('fetch for edit failed', err)
      alert('Failed to load survey for editing')
    }
  }

  /** Delete survey */
  // delete flow: open confirm dialog first, then call API on confirm
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDeleteById(id: string) {
    // open confirmation modal
    setDeleteTargetId(id)
    setDeleteOpen(true)
  }

  const { showToast } = useToast()

  async function performDelete() {
    if (!deleteTargetId) return
    setDeleteLoading(true)
    try {
      await deleteSurveyApi(deleteTargetId)
      setDeleteOpen(false)
      setDeleteTargetId(null)
      await reload()
      showToast('Survey deleted', 'success')
    } catch (err: any) {
      console.error('delete failed', err)
      const msg = err?.message ?? String(err)
      showToast(`Delete failed: ${msg}`, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const renderMenu = (id: string) => (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>
        <button type="button" className="dms-card-menu" aria-label="more" onClick={(e) => e.stopPropagation()}>
          <FaEllipsis />
        </button>
      </RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content className="dms-card-menu-content" sideOffset={6} align="end" onClick={(e) => e.stopPropagation()}>
          <RadixMenu.Item className="dms-card-menu-item" onSelect={() => openEditById(id)}>
            <FaPen /> แก้ไข
          </RadixMenu.Item>
          <RadixMenu.Item className="dms-card-menu-item is-danger" onSelect={() => handleDeleteById(id)}>
            <FaTrashCan /> ลบ
          </RadixMenu.Item>
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  )

  return (
    <ErrorBoundary>
      <section className="feature-page">
        <div className="dms-title-row">
          <div className="dms-title-block">
            <h1>Fire Alarm Survey</h1>
            <div className="dms-subtitle">Field technician checklist</div>
          </div>
          <div className="dms-title-search-row">
            <div className="dms-create-actions">
              <button
                className="dms-create-btn"
                onClick={() => { setEditing(null); setModalOpen(true) }}
              >
                New Survey
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <SurveyFilter
            search={search}
            statusFilter={statusFilter}
            total={total}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            viewMode={viewMode}
            onViewModeChange={(m) => setViewMode(m)}
          />

          {/* SURVEY LIST */}
          {total === 0 ? (
            <div className="dms-project-empty"><div>No surveys found</div></div>
          ) : (
            viewMode === 'grid' ? (
              <div className="dms-card-grid dms-survey-grid">
                {pageItems.map((s) => (
                  <article
                    key={s.id}
                    className="dms-project-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetailById(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDetailById(s.id)
                      }
                    }}
                  >
                    <div className="dms-card-head">
                      <div className="dms-project-icon-pill"><FaFileLines /></div>
                      <div className="dms-project-actions">
                        <span className={`dms-card-status is-${s.status}`}>{s.status}</span>
                        {renderMenu(s.id)}
                      </div>
                    </div>

                    <h3 className="dms-card-name">{s.projectName || '(no name)'}</h3>

                    <div className="dms-card-foot">
                      {s.surveyDate ? <div className="dms-card-meta dms-card-date">{formatThaiDate(s.surveyDate)}</div> : null}
                      {s.province ? <div className="dms-card-line">{s.province}</div> : null}
                      {s.fcpBrand ? <div className="dms-card-line">{`${s.fcpBrand} ${s.fcpModel || ''}`.trim()}</div> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dms-project-table-wrap">
                <table className="dms-project-table">
                  <thead>
                    <tr>
                      <th>ชื่อโครงการ</th>
                      <th>จังหวัด</th>
                      <th>วันที่สำรวจ</th>
                      <th>FCP</th>
                      <th>สถานะ</th>
                      <th aria-label="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((s) => (
                      <tr key={s.id} role="button" tabIndex={0} onClick={() => openDetailById(s.id)}>
                        <td>
                          <div className="dms-table-document">
                            <span className="dms-project-icon-pill"><FaFileLines /></span>
                            <span>{s.projectName || '(no name)'}</span>
                          </div>
                        </td>
                        <td>{s.province || ''}</td>
                        <td className="dms-table-nowrap">{formatThaiDate(s.surveyDate)}</td>
                        <td>{s.fcpBrand ? `${s.fcpBrand} ${s.fcpModel || ''}`.trim() : ''}</td>
                        <td><span className={`dms-card-status is-${s.status}`}>{s.status}</span></td>
                        <td className="dms-table-menu-cell">
                          {renderMenu(s.id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* PAGINATION */}
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

        {/* CREATE / EDIT MODAL */}
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
                <SurveyForm
                  initial={editing ?? undefined}
                  onSaved={(s) => { handleSaved(s); setModalOpen(false) }}
                  onClose={() => setModalOpen(false)}
                />
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>

        {/* DETAIL MODAL */}

        {/* Confirm delete dialog */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => { if (!v) { setDeleteTargetId(null); setDeleteOpen(false) } else setDeleteOpen(v) }}
          title="Confirm delete"
          description="ต้องการลบแบบสำรวจนี้จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={deleteLoading}
          onConfirm={performDelete}
        />
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
                {detailSurvey ? (
                  <SurveyDetail
                    survey={detailSurvey}
                    onClose={() => setDetailOpen(false)}
                    onEdit={(s) => { setDetailOpen(false); setEditing(s); setModalOpen(true) }}
                  />
                ) : (
                  <div>Loading...</div>
                )}
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </section>
    </ErrorBoundary>
  )
}