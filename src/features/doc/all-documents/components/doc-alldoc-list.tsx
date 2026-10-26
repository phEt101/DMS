import type { KeyboardEvent } from 'react'
import type { IconType } from 'react-icons'
import type { DocKind, MockDocument } from '../../document-types'

type Props = {
  documents: MockDocument[]
  layout: 'grid' | 'list'
  canCancel: boolean
  kindInfo: Record<DocKind, { title: string; icon: IconType }>
  statusInfo: Record<MockDocument['status'], { label: string }>
  dateText: (value: string) => string
  onSelect: (id: number) => void
  onCancel: (id: number) => void
  copy: any
}

const statusClass = (status: MockDocument['status']) =>
  status === 'approved' ? 'is-done' : status === 'rejected' || status === 'cancelled' ? 'is-cancelled' : 'is-submitted'

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

  if (layout === 'grid') {
    return (
      <div className="dms-card-grid dms-survey-grid documents-survey-grid">
        {documents.map((doc) => {
          const Icon = kindInfo[doc.kind].icon
          const sample = c.sampleDocuments[String(doc.id)] ?? {}
          const title = sample.title ?? doc.title
          const summary = sample.summary ?? doc.summary
          const note = sample.note ?? doc.note
          const showCancel = canCancel && doc.status === 'pending_mgr' && doc.employee === 'สมชาย ใจดี'

          return (
            <article
              className="dms-project-card documents-survey-card"
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
                  <span className={`dms-card-status ${statusClass(doc.status)}`}>{statusInfo[doc.status]?.label ?? doc.status}</span>
                </div>
              </div>
              <h3 className="dms-card-name">{title}</h3>
              <div className="dms-card-foot">
                <div className="dms-card-meta">{doc.no} · {kindInfo[doc.kind].title} · {dateText(doc.date)}</div>
                <div className="dms-card-line">{doc.employee} · {doc.department}</div>
                <div className="dms-card-line">{summary}</div>
                {note && <div className="dms-card-line documents-card-note">{c.detail.rejectionNote}: {note}</div>}
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
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <div className="dms-project-table-wrap">
      <table className="dms-project-table">
        <thead>
          <tr>
            <th>{c.table.numberKind}</th>
            <th>{c.table.details}</th>
            <th>{c.table.submitter}</th>
            <th>{c.table.submittedAt}</th>
            <th>{c.detail.status}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const Icon = kindInfo[doc.kind].icon
            const sample = c.sampleDocuments[String(doc.id)] ?? {}
            return (
              <tr
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(event) => activateOnKey(event, () => onSelect(doc.id))}
              >
                <td>
                  <div className="dms-table-document">
                    <span className="dms-project-icon-pill"><Icon /></span>
                    <span>{doc.no} · {kindInfo[doc.kind].title}</span>
                  </div>
                </td>
                <td>
                  {sample.title ?? doc.title}
                  <small className="documents-table-summary">{sample.summary ?? doc.summary}</small>
                </td>
                <td>
                  {doc.employee}
                  <small className="documents-table-summary">{doc.department}</small>
                </td>
                <td>{dateText(doc.date)}</td>
                <td>
                  <span className={`dms-card-status ${statusClass(doc.status)}`}>{statusInfo[doc.status]?.label ?? doc.status}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}