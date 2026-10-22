import { FaFileLines } from 'react-icons/fa6'
import DocAllDocumentsFilters from '../../all-documents/components/doc-alldoc-filters'
import DocAllDocumentsList from '../../all-documents/components/doc-alldoc-list'
import { PaginationFooter } from '../../../../components/pagination-footer'
import type { DocKind, MockDocument, MockEmployee } from '../../document-types'
import type { IconType } from 'react-icons'
type Props = {
  documents: MockDocument[]
  totalDocs: number
  page: number
  totalPages: number
  pageSize: number
  layout: 'grid' | 'list'
  onLayout: (layout: 'grid' | 'list') => void
  search: string
  onSearch: (value: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  mockRole: MockEmployee['role']
  kindInfo: Record<DocKind, { title: string; icon: IconType }>
  statusInfo: Record<MockDocument['status'], { label: string }>
  dateText: (value: string) => string
  onSelect: (id: number) => void
  onCancel: (id: number) => void
  copy: any
}
export default function DocPendingApproval({
  documents, totalDocs, page, totalPages, pageSize,
  layout, onLayout, search, onSearch, onPageChange, onPageSizeChange,
  mockRole, kindInfo, statusInfo, dateText, onSelect, onCancel, copy,
}: Props) {
  // หน้า pending: สถานะ fixed เป็น "รอตรวจ" — ใช้ filter panel เดียวกับหน้า all ได้
  return <>
    <DocAllDocumentsFilters
      search={search} onSearch={onSearch} layout={layout} onLayout={onLayout}
      status="all" kind="all" department="all" draftStatus="all" draftKind="all" draftDepartment="all"
      onDraftStatus={() => {}} onDraftKind={() => {}} onDraftDepartment={() => {}}
      departmentOptions={[]}
      filterOpen={false} onToggle={() => {}} count={totalDocs}
      onApply={() => {}} onReset={() => {}} copy={copy}
    />
    <div className="documents-tools"><span className="documents-stat"><FaFileLines /> {totalDocs} {copy.messages.mockPendingCount}</span></div>
    <DocAllDocumentsList
      documents={documents} layout={layout} canCancel={false} kindInfo={kindInfo} statusInfo={statusInfo} dateText={dateText}
      onSelect={onSelect} onCancel={onCancel} copy={copy}
    />
    {totalDocs > 0 && (
      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={totalDocs}
        labels={{ previous: copy.filters.previous, next: copy.filters.next, page: copy.filters.page, perPage: copy.filters.perPage }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    )}
  </>
}
