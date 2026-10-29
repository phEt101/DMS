import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { FaFilter, FaList, FaMagnifyingGlass, FaPlus, FaTableCellsLarge, FaUser, FaXmark } from 'react-icons/fa6'
import { PaginationFooter } from '../../../../components/pagination-footer'
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
  loading?: boolean
  error?: string
  readOnly?: boolean
  copy: any
}

type Draft = Omit<MockEmployee, 'id'>
const today = () => new Date().toISOString().slice(0, 10)
const blankEmployee = (): Draft => ({ name: '', code: '', department: '', email: '', emailNotify: true, role: 'พนักงาน', sick: 30, personal: 3, vacation: 6, other: 0, active: true, startDate: today(), appointedDate: today() })
const roleLabels: MockEmployee['role'][] = ['พนักงาน', 'ผู้จัดการแผนก', 'HR']

export default function DocEmployeesPanel({ employees, documents, policyStart, policyEnd, matches, mockRole, query, onQuery, onSave, onToggleActive, loading = false, error = '', readOnly = false, copy: c }: Props) {
  const [editing, setEditing] = useState<MockEmployee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankEmployee)
  const [formError, setFormError] = useState('')
  // pagination + card/list toggle (เหมือนหน้าจอ survey)
  const [empLayout, setEmpLayout] = useState<'grid' | 'list'>('grid')
  const [empPage, setEmpPage] = useState(1)
  const [empPageSize, setEmpPageSize] = useState(10)
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
    if (!name || !code) { setFormError(c.employees.required); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFormError(c.employees.invalidEmail); return }
    if (employees.some((person) => person.code.trim().toLocaleLowerCase() === code.toLocaleLowerCase() && person.id !== editing?.id)) { setFormError(c.employees.duplicateCode); return }
    onSave({ ...draft, id: editing?.id ?? `mock-${Date.now()}`, name, code, email })
    closeForm()
  }
  const activateCard = (event: KeyboardEvent<HTMLElement>, employee: MockEmployee) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openForm(employee) }
  }

  // pagination: กลับหน้า 1 เมื่อค้นหาเปลี่ยน
  const empTotal = matches.length
  const empTotalPages = Math.max(Math.ceil(empTotal / empPageSize), 1)
  const empPageSafe = Math.max(1, Math.min(empPage, empTotalPages))
  const empPaged = useMemo(() => matches.slice((empPageSafe - 1) * empPageSize, empPageSafe * empPageSize), [matches, empPageSafe, empPageSize])
  const handleQuery = (value: string) => { onQuery(value); setEmpPage(1) }

  return <>
    <div className="dms-title-search-row documents-employee-toolbar">
      <div className="dms-search-wrap"><FaMagnifyingGlass className="dms-search-icon"/><input value={query} onChange={(event) => handleQuery(event.target.value)} placeholder={c.employees.search} aria-label={c.employees.searchLabel}/></div>
      <div className="documents-filter-tools">
        <div className="documents-view-toggle"><button aria-label={c.filters.cardView} aria-pressed={empLayout==='grid'} onClick={()=>setEmpLayout('grid')}><FaTableCellsLarge/></button><button aria-label={c.filters.listView} aria-pressed={empLayout==='list'} onClick={()=>setEmpLayout('list')}><FaList/></button></div>
        <div className="dms-stats-group"><div className="dms-stats-pill">{empTotal} {c.employees.count}</div></div>
      </div>
      {!readOnly && mockRole === 'HR' && <div className="dms-create-actions"><button className="dms-create-btn" onClick={() => openForm()}><FaPlus/> {c.employees.add}</button></div>}
    </div>

    {error && <div className="documents-employee-empty" role="alert">{error}</div>}
    {loading ? <div className="documents-employee-empty">{c.employees.loading}</div> : empPaged.length === 0 ? <div className="documents-employee-empty">{c.employees.noMatches}</div> : empLayout === 'grid' ? <div className="dms-card-grid dms-survey-grid documents-employee-grid">{empPaged.map((employee) => <article key={employee.id} className="dms-project-card documents-employee-card" role={readOnly ? undefined : 'button'} tabIndex={readOnly ? undefined : 0} aria-label={readOnly ? undefined : `แก้ไขข้อมูล ${employee.name}`} onClick={readOnly ? undefined : () => openForm(employee)} onKeyDown={readOnly ? undefined : (event) => activateCard(event, employee)}>
      <div className="documents-employee-card-top"><span className="documents-employee-avatar"><FaUser/></span><span className={`dms-card-status ${employee.active ? 'is-active' : 'is-cancelled'}`}>{employee.active ? c.roles[employee.role === 'พนักงาน' ? 'employee' : employee.role === 'HR' ? 'hr' : 'manager'] : c.employees.inactive}</span></div>
      <h2 className="documents-employee-name">{employee.name}</h2>
      <div className="documents-employee-meta">{readOnly ? employee.role : employee.role === 'HR' ? c.roles.hr : employee.role === 'ผู้จัดการแผนก' ? c.roles.manager : c.roles.employee}{employee.department && <> · {employee.department}</>}{employee.email && <><br/>{employee.email}</>}{employee.code && <><br/>{employee.code}</>}</div>
      {!readOnly && <div className="documents-employee-balances"><span>{c.employees.leaveSick} <b>{remaining(employee, 'sick')}/{employee.sick}</b></span><span>{c.employees.leavePersonal} <b>{remaining(employee, 'personal')}/{employee.personal}</b></span><span>{c.employees.leaveVacation} <b>{remaining(employee, 'vacation')}/{employee.vacation}</b></span></div>}
    </article>)}</div> : <div className="dms-project-table-wrap"><table className="dms-project-table"><thead><tr><th>{c.employees.name}</th><th>{c.employees.code}</th><th>{c.employees.departmentLabel}</th><th>{c.employees.email}</th></tr></thead><tbody>{empPaged.map((employee) => <tr key={employee.id} role={readOnly ? undefined : 'button'} tabIndex={readOnly ? undefined : 0} onClick={readOnly ? undefined : () => openForm(employee)} onKeyDown={readOnly ? undefined : (event) => activateCard(event, employee)}><td>{employee.name}</td><td>{employee.code}</td><td>{employee.department || c.employees.noDepartment}</td><td>{employee.email}</td></tr>)}</tbody></table></div>}
    {empTotal > 0 && <PaginationFooter page={empPageSafe} pageSize={empPageSize} total={empTotal} labels={{ previous: c.filters.previous, next: c.filters.next, page: c.filters.page, perPage: c.filters.perPage }} onPageChange={(p: number) => setEmpPage(Math.max(1, Math.min(p, empTotalPages)))} onPageSizeChange={(s: number) => { setEmpPageSize(s); setEmpPage(1) }} />}

    {!readOnly && formOpen && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}><form className="dms-modal dms-create-doc-modal documents-employee-modal" onSubmit={save}>
      <h2 className="dms-modal-title">{editing ? c.employees.edit : c.employees.add}</h2><p className="dms-modal-subtitle">{editing ? `${editing.code} · ${c.employees.formSubtitleEdit}` : c.employees.formSubtitleAdd}</p>
      <button type="button" className="modal-close" aria-label={c.detail.close} onClick={closeForm}><FaXmark/></button>
      <div className="documents-employee-form-grid">
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.name}</span><input className="dms-form-input" required value={draft.name} onChange={(event) => change('name', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.code}</span><input className="dms-form-input" required value={draft.code} onChange={(event) => change('code', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.departmentLabel}</span><input className="dms-form-input" value={draft.department} onChange={(event) => change('department', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.email}</span><input className="dms-form-input" type="email" required value={draft.email ?? ''} onChange={(event) => change('email', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.role}</span><select className="dms-form-input" value={draft.role} onChange={(event) => change('role', event.target.value as MockEmployee['role'])}>{roleLabels.map((role) => <option key={role} value={role}>{c.roles[role === 'พนักงาน' ? 'employee' : role === 'HR' ? 'hr' : 'manager']}</option>)}</select></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.startDate}</span><input className="dms-form-input" type="date" value={draft.startDate} onChange={(event) => change('startDate', event.target.value)}/></label>
        <label className="dms-form-field"><span className="dms-form-label">{c.employees.appointedDate}</span><input className="dms-form-input" type="date" value={draft.appointedDate} onChange={(event) => change('appointedDate', event.target.value)}/></label>
      </div>
      <h3 className="documents-employee-entitlement-title">{c.employees.entitlements}</h3>
      <div className="documents-employee-form-grid documents-employee-entitlements">
        {([['sick', c.leaveTypes.sick], ['personal', c.leaveTypes.personal], ['vacation', c.leaveTypes.vacation], ['other', c.employees.leaveOther]] as const).map(([key, label]) => <label className="dms-form-field" key={key}><span className="dms-form-label">{label}</span><input className="dms-form-input" type="number" min="0" step="0.5" value={draft[key] ?? 0} onChange={(event) => change(key, Math.max(0, Number(event.target.value) || 0))}/></label>)}
      </div>
      <label className="documents-employee-email-toggle"><input type="checkbox" checked={draft.emailNotify !== false} onChange={(event) => change('emailNotify', event.target.checked)}/> {c.employees.emailNotify}</label>
      {formError && <p className="documents-employee-error" role="alert">{formError}</p>}
      <div className="documents-employee-form-actions"><button className="dms-create-btn" type="submit">{c.employees.save}</button>{editing && <button className={`documents-employee-toggle ${editing.active ? 'is-disable' : 'is-enable'}`} type="button" onClick={() => { onToggleActive(editing.id); closeForm() }}>{editing.active ? c.employees.disable : c.employees.enable}</button>}</div>
    </form></div>}
  </>
}
