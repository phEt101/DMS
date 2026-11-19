import type { KeyboardEvent } from 'react'
import type { IconType } from 'react-icons'
import type { DisplayStatus, DocKind, MockDocument } from '../../document-types'
import { displayStatusOf } from '../../document-types'

type Props = {
  documents: MockDocument[]
  layout: 'grid' | 'list'
  canCancel: boolean
  kindInfo: Record<DocKind, { title: string; icon: IconType }>
  statusInfo: Partial<Record<DisplayStatus, { label: string }>>
  dateText: (value: string) => string
  onSelect: (id: number) => void
  onCancel: (id: number) => void
  copy: any
}

const statusClass = (status: DisplayStatus) =>
  status === 'approved' ? 'is-done'
    : status === 'resubmitted' ? 'is-revised'
      : status === 'rejected' || status === 'cancelled' ? 'is-cancelled' : 'is-submitted'

const STAGE_LABEL_KEY = { manager: 'manager', executive: 'executive', hr: 'hr' } as const

function activateOnKey(event: KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

export default function DocAllDocumentsList({
  documents, layout, canCancel, kindInfo, statusInfo, dateText, onSelect, onCancel, copy: c,
}: Props) {
  if (!documents.length) return <div className="documents-empty">{c.filters.empty}</div>

  // ข้อความบรรทัดรองใต้สถานะ: บอกขั้นที่กำลังรอ หรือผู้ที่ไม่อนุมัติ (ไม่ยัดขั้นรวมกับชื่อสถานะ)
  const statusDetail = (doc: MockDocument, status: DisplayStatus) => {
    const stageOf = (statusKey: MockDocument['status']) => statusKey === 'pending_mgr' ? c.detail.manager
      : statusKey === 'pending_exec' ? c.detail.executive
        : statusKey === 'pending_hr' ? c.detail.hr : ''
    if (status === 'rejected') {
      const rejectedStage = doc.rejectedBy ? c.detail[STAGE_LABEL_KEY[doc.rejectedBy]] : ''
      const rejectedAt = doc.lastRejectedAt ? dateText(String(doc.lastRejectedAt).slice(0, 10)) : ''
      return [rejectedStage ? `${c.detail.rejectedBy} ${rejectedStage}` : '', rejectedAt].filter(Boolean).join(' · ')
    }
    if (status === 'resubmitted' || status.startsWith('pending')) {
      return [c.detail.waiting, stageOf(doc.status)].filter(Boolean).join(' · ')
    }
    return ''
  }

  const historyCell = (doc: MockDocument) => {
    const rejectionCount = doc.rejectionCount ?? (doc.note ? 1 : 0)
    if (!rejectionCount) return <span className="documents-history-none">—</span>
    return <>
      <b className="documents-history-count">{String(c.detail.rejectionCount).replace('{n}', String(rejectionCount))}</b>
      <small className="documents-history-detail">
        {doc.resubmittedAt
          ? String(c.detail.resubmittedOn).replace('{date}', dateText(String(doc.resubmittedAt).slice(0, 10)))
          : c.detail.notResubmitted}
      </small>
    </>
  }

  const revisionBadge = (doc: MockDocument) => doc.revisionNo
    ? <span className="documents-revision-badge">{String(c.detail.revisionNo).replace('{n}', String(doc.revisionNo))}</span>
    : null

  const rejectionLine = (doc: MockDocument, status: DisplayStatus) => {
    if (!doc.note || (status !== 'rejected' && status !== 'resubmitted')) return null
    return <p className="documents-rejection-preview">
      <b>{status === 'resubmitted' ? c.detail.rejectionReasonPrevious : c.detail.rejectionReason}:</b> {doc.note}
    </p>
  }

  if (layout === 'grid') {
    return (
      <div className="dms-card-grid dms-survey-grid documents-survey-grid">
        {documents.map((doc) => {
          const Icon = kindInfo[doc.kind].icon
          const sample = c.sampleDocuments[String(doc.id)] ?? {}
          const title = sample.title ?? doc.title
          const summary = sample.summary ?? doc.summary
          const status = displayStatusOf(doc)
          const showCancel = canCancel && doc.status === 'pending_mgr' && doc.employee === 'สมชาย ใจดี'

          return (
            <div
              className={`dms-project-card documents-survey-card${status === 'resubmitted' ? ' is-revised' : ''}`}
              key={doc.id}
              role="button"
              tabIndex={0}
              aria-label={`${c.detail.title}: ${title}`}
              onClick={() => onSelect(doc.id)}
              onKeyDown={(event) => activateOnKey(event, () => onSelect(doc.id))}
            >
              <div className="dms-card-head">
                <span className="dms-project-icon-pill"><Icon /></span>
                <div className="dms-project-actions">
                  <span className={`dms-card-status ${statusClass(status)}`}>{statusInfo[status]?.label ?? status}</span>
                </div>
              </div>
              {doc.resubmittedFromRequestNo && <div className="documents-resubmission-label">{String(c.detail.resubmittedFrom).replace('{no}', doc.resubmittedFromRequestNo)}</div>}
              <h3 className="dms-card-name">{title}</h3>
              {rejectionLine(doc, status)}
              <div className="dms-card-foot">
                <div className="dms-card-meta">{doc.no} · {kindInfo[doc.kind].title} · {dateText(doc.date)}</div>
                {revisionBadge(doc)}
                <div className="dms-card-line">{doc.employee} · {doc.department}</div>
                <div className="dms-card-line">{summary}</div>
                <div className="documents-card-history">{historyCell(doc)}</div>
                {status === 'rejected' && (
                  <button
                    type="button"
                    className="documents-edit-rejected"
                    onClick={(event) => { event.stopPropagation(); onSelect(doc.id) }}
                  >
                    {c.detail.resubmit}
                  </button>
                )}
                {showCancel && (
                  <button
                    type="button"
                    className="documents-cancel-card"
                    onClick={(event) => { event.stopPropagation(); onCancel(doc.id) }}
                  >
                    {c.detail.cancel}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="dms-project-table-wrap">
      <table className="dms-project-table documents-documents-table">
        <thead>
          <tr>
            <th>{c.table.numberKind}</th>
            <th>{c.table.details}</th>
            <th>{c.table.submitter}</th>
            <th>{c.detail.status}</th>
            <th>{c.table.history}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const Icon = kindInfo[doc.kind].icon
            const sample = c.sampleDocuments[String(doc.id)] ?? {}
            const status = displayStatusOf(doc)
            const detail = statusDetail(doc, status)
            return (
              <tr
                key={doc.id}
                tabIndex={0}
                className={status === 'resubmitted' ? 'is-revised' : undefined}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(event) => activateOnKey(event, () => onSelect(doc.id))}
              >
                <td>
                  <div className="dms-table-document">
                    <span className="dms-project-icon-pill"><Icon /></span>
                    <span>{doc.no} · {kindInfo[doc.kind].title}</span>
                  </div>
                  <small className="documents-table-submitted">{dateText(doc.date)}</small>
                  {revisionBadge(doc)}
                  {doc.resubmittedFromRequestNo && <small className="documents-resubmission-label">{String(c.detail.resubmittedFrom).replace('{no}', doc.resubmittedFromRequestNo)}</small>}
                </td>
                <td>
                  <span className="documents-table-title">{sample.title ?? doc.title}</span>
                  <small className="documents-table-summary">{sample.summary ?? doc.summary}</small>
                  {rejectionLine(doc, status)}
                </td>
                <td>
                  {doc.employee}
                  <small className="documents-table-summary">{doc.department}</small>
                </td>
                <td>
                  <span className={`dms-card-status ${statusClass(status)}`}>{statusInfo[status]?.label ?? status}</span>
                  {detail && <small className="documents-table-stage">{detail}</small>}
                </td>
                <td>
                  <div className="documents-history-cell">{historyCell(doc)}</div>
                  {status === 'rejected' && (
                    <button
                      type="button"
                      className="documents-edit-rejected"
                      onClick={(event) => { event.stopPropagation(); onSelect(doc.id) }}
                    >
                      {c.detail.resubmit}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
