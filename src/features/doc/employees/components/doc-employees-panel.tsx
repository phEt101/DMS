import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { FaMagnifyingGlass, FaPlus, FaUser, FaXmark } from 'react-icons/fa6'
import type { MockDocument, MockEmployee } from '../../document-types'

type Props = {
  employees: MockEmployee[]
  documents: MockDocument[]
  policyStart: string
  policyEnd: string
  matches: MockEmployee[]
  mockRole: MockEmployee['role']
  query: string
  onQuery: (value: string) => void
  onSave: (employee: MockEmployee) => void
  onToggleActive: (id: string) => void
}

type Draft = Omit<MockEmployee, 'id'>
const today = () => new Date().toISOString().slice(0, 10)
const blankEmployee = (): Draft => ({ name: '', code: '', department: '', position: '', email: '', emailNotify: true, role: 'พนักงาน', manager: '', sick: 30, personal: 3, vacation: 6, other: 0, emergency: 0, active: true, startDate: today(), appointedDate: today() })
const roleLabels: MockEmployee['role'][] = ['พนักงาน', 'ผู้จัดการแผนก', 'HR']

export default function DocEmployeesPanel({ employees, documents, policyStart, policyEnd, matches, mockRole, query, onQuery, onSave, onToggleActive }: Props) {
  const [editing, setEditing] = useState<MockEmployee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankEmployee)
  const [formError, setFormError] = useState('')
  const managers = useMemo(() => employees.filter((employee) => employee.role === 'ผู้จัดการแผนก' && employee.id !== editing?.id), [employees, editing?.id])

  const openForm = (employee?: MockEmployee) => {
    setFormOpen(true)
    setEditing(employee ?? null)
    setDraft(employee ? { ...blankEmployee(), ...employee } : blankEmployee())
    setFormError('')
  }
  const closeForm = () => { setEditing(null); setFormOpen(false); setFormError('') }
  const change = <K extends keyof Draft,>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const used = (employee: MockEmployee, type: 'sick' | 'personal' | 'vacation' | 'emergency') => documents.filter((doc) => { const date = doc.from ?? doc.date; return doc.kind === 'leave' && doc.employee === employee.name && doc.status === 'approved' && doc.leaveType === type && date >= policyStart && date <= policyEnd }).reduce((sum, doc) => sum + (doc.days ?? 0), 0)
  const remaining = (employee: MockEmployee, type: 'sick' | 'personal' | 'vacation') => Math.max(0, employee[type] - used(employee, type) - (type === 'vacation' ? used(employee, 'emergency') : 0))
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = draft.name.trim()
    const code = draft.code.trim()
    const email = (draft.email ?? '').trim()
    if (!name || !code) { setFormError('กรอกชื่อและรหัสประจำตัวให้ครบ'); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFormError('กรอกอีเมลให้ถูกต้อง'); return }
    if (employees.some((person) => person.code.trim().toLocaleLowerCase() === code.toLocaleLowerCase() && person.id !== editing?.id)) { setFormError('รหัสประจำตัวนี้มีอยู่แล้ว'); return }
    onSave({ ...draft, id: editing?.id ?? `mock-${Date.now()}`, name, code, email, manager: draft.manager || '—' })
    closeForm()
  }
  const activateCard = (event: KeyboardEvent<HTMLElement>, employee: MockEmployee) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openForm(employee) }
  }

  return <>
    <div className="dms-title-search-row documents-employee-toolbar">
      <div className="dms-search-wrap"><FaMagnifyingGlass className="dms-search-icon"/><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส แผนก" aria-label="ค้นหาพนักงาน"/></div>
      <div className="dms-stats-group"><div className="dms-stats-pill">{matches.length} คน</div></div>
      {mockRole === 'HR' && <div className="dms-create-actions"><button className="dms-create-btn" onClick={() => openForm()}><FaPlus/> เพิ่มพนักงาน</button></div>}
    </div>

    {matches.length ? <div className="dms-card-grid dms-survey-grid documents-employee-grid">{matches.map((employee) => <article key={employee.id} className="dms-project-card documents-employee-card" role="button" tabIndex={0} aria-label={`แก้ไขข้อมูล ${employee.name}`} onClick={() => openForm(employee)} onKeyDown={(event) => activateCard(event, employee)}>
      <div className="documents-employee-card-top"><span className="documents-employee-avatar"><FaUser/></span><span className={`dms-card-status ${employee.active ? 'is-active' : 'is-cancelled'}`}>{employee.active ? employee.role : 'ปิดใช้งาน'}</span></div>
      <h2 className="documents-employee-name">{employee.name}</h2>
      <div className="documents-employee-meta">{employee.position || 'ไม่ระบุตำแหน่ง'} · {employee.department || 'ไม่ระบุแผนก'}<br/>{employee.code}{employee.email ? ` · ${employee.email}` : ''}</div>
      <div className="documents-employee-balances"><span>ป่วย <b>{remaining(employee, 'sick')}/{employee.sick}</b></span><span>กิจ <b>{remaining(employee, 'personal')}/{employee.personal}</b></span><span>พักร้อน <b>{remaining(employee, 'vacation')}/{employee.vacation}</b></span></div>
      <div className="documents-employee-manager">ผู้จัดการที่อนุมัติ: {employee.manager || '—'}</div>
    </article>)}</div> : <div className="documents-employee-empty">ไม่พบพนักงานที่ตรงกับคำค้น</div>}

    {formOpen && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}><form className="dms-modal dms-create-doc-modal documents-employee-modal" onSubmit={save}>
      <h2 className="dms-modal-title">{editing ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h2><p className="dms-modal-subtitle">{editing ? `${editing.code} · แก้ไขข้อมูล สิทธิ์วันลา และการใช้งาน` : 'กรอกข้อมูลและกำหนดสิทธิ์วันลา'}</p>
      <button type="button" className="modal-close" aria-label="ปิด" onClick={closeForm}><FaXmark/></button>
      <div className="documents-employee-form-grid">
        <label className="dms-form-field"><span className="dms-form-label">ชื่อ - นามสกุล</span><input className="dms-form-input" required value={draft.name} onChange={(event) => change('name', event.target.value)} autoFocus/></label>
        <label className="dms-form-field"><span className="dms-form-label">รหัสประจำตัว</span><input className="dms-form-input" required value={draft.code} onChange={(event) => change('code', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">แผนก</span><input className="dms-form-input" value={draft.department} onChange={(event) => change('department', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">ตำแหน่ง</span><input className="dms-form-input" value={draft.position} onChange={(event) => change('position', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">อีเมล (รับแจ้งเตือน)</span><input className="dms-form-input" type="email" required value={draft.email ?? ''} onChange={(event) => change('email', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">บทบาทในระบบ</span><select className="dms-form-input" value={draft.role} onChange={(event) => change('role', event.target.value as MockEmployee['role'])}>{roleLabels.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="dms-form-field"><span className="dms-form-label">ผู้จัดการที่อนุมัติ</span><select className="dms-form-input" value={draft.manager === '—' ? '' : draft.manager} onChange={(event) => change('manager', event.target.value)}><option value="">— ไม่มี (ส่งตรง HR)</option>{managers.map((manager) => <option key={manager.id} value={manager.name}>{manager.name}</option>)}</select></label>
        <label className="dms-form-field"><span className="dms-form-label">วันที่เริ่มทำงาน</span><input className="dms-form-input" type="date" value={draft.startDate} onChange={(event) => change('startDate', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">วันที่บรรจุงาน</span><input className="dms-form-input" type="date" value={draft.appointedDate} onChange={(event) => change('appointedDate', event.target.value)}/></label>
      </div>
      <h3 className="documents-employee-entitlement-title">สิทธิ์วันลาประจำปี (วัน)</h3>
      <div className="documents-employee-form-grid documents-employee-entitlements">
        {([['sick', 'ลาป่วย'], ['personal', 'ลากิจ'], ['vacation', 'ลาพักร้อน'], ['other', 'ลาพิเศษอื่น ๆ'], ['emergency', 'พักร้อนฉุกเฉิน (วัน/ปี)']] as const).map(([key, label]) => <label className="dms-form-field" key={key}><span className="dms-form-label">{label}</span><input className="dms-form-input" type="number" min="0" step="0.5" value={draft[key] ?? 0} onChange={(event) => change(key, Math.max(0, Number(event.target.value) || 0))}/></label>)}
      </div>
      <label className="documents-employee-email-toggle"><input type="checkbox" checked={draft.emailNotify !== false} onChange={(event) => change('emailNotify', event.target.checked)}/> ส่งอีเมลแจ้งเตือนให้พนักงานคนนี้</label>
      {formError && <p className="documents-employee-error" role="alert">{formError}</p>}
      <div className="documents-employee-form-actions"><button className="dms-create-btn" type="submit">บันทึกข้อมูล</button>{editing && <button className={`documents-employee-toggle ${editing.active ? 'is-disable' : 'is-enable'}`} type="button" onClick={() => { onToggleActive(editing.id); closeForm() }}>{editing.active ? 'ปิดใช้งานพนักงาน' : 'เปิดใช้งานอีกครั้ง'}</button>}</div>
    </form></div>}
  </>
}
