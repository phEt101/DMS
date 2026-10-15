import { FaFileLines } from 'react-icons/fa6'
import DocAllDocumentsList from '../../all-documents/components/doc-alldoc-list'
import type { DocKind, MockDocument, MockEmployee } from '../../document-types'
import type { IconType } from 'react-icons'
type Props = {
  documents: MockDocument[]
  mockRole: MockEmployee['role']
  kindInfo: Record<DocKind, { title: string; icon: IconType }>
  statusInfo: Record<MockDocument['status'], { label: string }>
  dateText: (value: string) => string
  onSelect: (id: number) => void
  onCancel: (id: number) => void
  copy: any
}
export default function DocPendingApproval({ documents, mockRole, kindInfo, statusInfo, dateText, onSelect, onCancel, copy }: Props) {
  return <>
    <div className="documents-tools"><span className="documents-stat"><FaFileLines /> {documents.length} {copy.messages.mockPendingCount}</span></div>
    <DocAllDocumentsList documents={documents} layout="grid" canCancel={false} kindInfo={kindInfo} statusInfo={statusInfo} dateText={dateText} onSelect={onSelect} onCancel={onCancel} copy={copy} />
  </>
}
