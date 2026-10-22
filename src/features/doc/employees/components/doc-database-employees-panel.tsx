import { useMemo, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { FaFileLines, FaFilter, FaList, FaMagnifyingGlass, FaPlus, FaTableCellsLarge, FaUser, FaXmark } from 'react-icons/fa6'
import { PaginationFooter } from '../../../../components/pagination-footer'
import { createUser, updateUser, type User } from '../../../settings/users/services/users.service'
import { listDepartments, type Department } from '../../../settings/access/departments/services/departments.service'
import { listRoles, type Role } from '../../../settings/access/roles/services/roles.service'
import type { Translations } from '../../../../locales'

type Props = {
  users: User[]
  title: string
  subtitle: string
  companyId: number
  companyName: string
  loading: boolean
  error: string
  query: string
  onQuery: (query: string) => void
  onUpdated: (user: User) => void
  onCreated: (user: User) => void
  copy: Translations['features']['documentManagement']
}

type Draft = Pick<User, 'firstName' | 'lastName' | 'email' | 'role'> & {
  phone: string; department: string; isActive: boolean; employeeCode: string; managerUserId: number | null;
  employmentStartDate: string; appointedDate: string; sickLeaveDays: number | null; personalLeaveDays: number | null;
  vacationLeaveDays: number | null; otherLeaveDays: number | null; emailNotificationsEnabled: boolean
}
type NewDraft = Draft & { password: string }

// ---------- สี role: คำนวณจากชื่อ role ให้ได้สีเดิมเสมอ ----------
const ROLE_PALETTE = [
  { bg: '#f2f0ff', fg: '#5143e8' },
  { bg: '#e0f2fe', fg: '#0369a1' },
  { bg: '#fff7e6', fg: '#b45309' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#ccfbf1', fg: '#0f766e' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#ffedd5', fg: '#c2410c' },
]
const roleStyle = (role: string) => {
  let hash = 0
  for (const char of role) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const color = ROLE_PALETTE[hash % ROLE_PALETTE.length]
  return { '--emp-bg': color.bg, '--emp-fg': color.fg } as CSSProperties
}
const dayText = (value: number | null | undefined) => value === null || value === undefined ? '–' : String(value)

export default function DocDatabaseEmployeesPanel({ users, title, subtitle, companyId, companyName, loading, error, query, onQuery, onUpdated, onCreated, copy: c }: Props) {
  const [selected, setSelected] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [newDraft, setNewDraft] = useState<NewDraft | null>(null)
  // filter แบบหน้าจัดการเอกสาร: ปุ่ม Filter เปิดแผ่นกรองแผนก/บทบาท (apply/reset)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [draftDepartment, setDraftDepartment] = useState('all')
  const [draftRole, setDraftRole] = useState('all')
  const departmentOptions = useMemo(() => Array.from(new Set(users.map((user) => user.department).filter(Boolean) as string[])).sort(), [users])
  const roleOptions = useMemo(() => Array.from(new Set(users.map((user) => user.role).filter(Boolean) as string[])).sort(), [users])
  const matches = useMemo(() => users.filter((user) => {
    if (query && !`${user.name} ${user.email} ${user.department ?? ''} ${user.role}`.toLocaleLowerCase('th').includes(query.toLocaleLowerCase('th'))) return false
    if (departmentFilter !== 'all' && (user.department ?? '') !== departmentFilter) return false
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    return true
  }), [users, query, departmentFilter, roleFilter])

  const openDetails = (user: User) => { setSelected(user); setEditing(false); setSaveError('') }
  const close = () => { setSelected(null); setEditing(false); setDraft(null); setSaveError('') }
  const beginCreate = async () => {
    setSelected(null)
    setEditing(false)
    setSaveError('')
    setNewDraft({ firstName: '', lastName: '', email: '', phone: '', role: 'user', department: '', isActive: true, employeeCode: '', managerUserId: null, employmentStartDate: '', appointedDate: '', sickLeaveDays: 30, personalLeaveDays: 3, vacationLeaveDays: 3, otherLeaveDays: 1, emailNotificationsEnabled: true, password: '' })
    setCreateOpen(true)
    try {
      const [roleResponse, departmentResponse] = await Promise.all([listRoles(), listDepartments()])
      const activeRoles = roleResponse.data.filter((role) => Boolean(role.isActive))
      setRoles(activeRoles)
      setDepartments(departmentResponse.data.filter((department) => Boolean(department.isActive)))
      setNewDraft((current) => current ? { ...current, role: activeRoles.find((role) => role.name === 'user')?.name ?? activeRoles[0]?.name ?? current.role } : current)
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : c.employees.loadError)
    }
  }
  const beginEdit = async () => {
    if (!selected) return
    setDraft({ firstName: selected.firstName, lastName: selected.lastName, email: selected.email, phone: selected.phone ?? '', role: selected.role, department: selected.department ?? '', isActive: Boolean(selected.isActive), employeeCode: selected.employeeCode ?? '', managerUserId: selected.managerUserId, employmentStartDate: selected.employmentStartDate?.slice(0, 10) ?? '', appointedDate: selected.appointedDate?.slice(0, 10) ?? '', sickLeaveDays: selected.sickLeaveDays, personalLeaveDays: selected.personalLeaveDays, vacationLeaveDays: selected.vacationLeaveDays, otherLeaveDays: selected.otherLeaveDays, emailNotificationsEnabled: selected.emailNotificationsEnabled ?? true })
    setEditing(true)
    setSaveError('')
    try {
      const [roleResponse, departmentResponse] = await Promise.all([listRoles(), listDepartments()])
      setRoles(roleResponse.data.filter((role) => Boolean(role.isActive)))
      setDepartments(departmentResponse.data.filter((department) => Boolean(department.isActive)))
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : c.employees.loadError)
    }
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !draft) return
    setSaving(true)
    setSaveError('')
    try {
      const response = await updateUser(selected.id, draft)
      onUpdated(response.data)
      setSelected(response.data)
      setEditing(false)
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : c.employees.saveError)
    } finally {
      setSaving(false)
    }
  }
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newDraft) return
    if (!companyId) { setSaveError(c.employees.companyRequired); return }
    setSaving(true)
    setSaveError('')
    try {
      const response = await createUser({ ...newDraft, companyId })
      onCreated(response.data)
      setCreateOpen(false)
      setNewDraft(null)
      setSelected(response.data)
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : c.employees.saveError)
    } finally {
      setSaving(false)
    }
  }
  const activateCard = (event: KeyboardEvent<HTMLElement>, user: User) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(user) }
  }

  // toolbar แบบหน้าจัดการเอกสาร: Filter + Card/List toggle + Pagination
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const activeCount = (departmentFilter !== 'all' ? 1 : 0) + (roleFilter !== 'all' ? 1 : 0)
  const applyFilters = () => { setDepartmentFilter(draftDepartment); setRoleFilter(draftRole); setPage(1) }
  const resetFilters = () => { setDraftDepartment('all'); setDraftRole('all'); setDepartmentFilter('all'); setRoleFilter('all'); setPage(1) }
  const empTotal = matches.length
  const empTotalPages = Math.max(Math.ceil(empTotal / pageSize), 1)
  const pageSafe = Math.max(1, Math.min(page, empTotalPages))
  const pagedUsers = matches.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)

  // badge สี role + chip วันลาสะสม (ป่วย / กิจ / พักร้อน / อื่น ๆ)
  const roleBadge = (employee: User) => <span className="emp-badge" style={roleStyle(employee.role)}>{employee.role}</span>
  const leaveChips = (employee: User) => <div className="emp-leaves">
    <span className="emp-leave emp-leave--sick">{c.leaveTypes.sick} <b>{dayText(employee.sickLeaveDays)}</b></span>
    <span className="emp-leave emp-leave--personal">{c.leaveTypes.personal} <b>{dayText(employee.personalLeaveDays)}</b></span>
    <span className="emp-leave emp-leave--vacation">{c.leaveTypes.vacation} <b>{dayText(employee.vacationLeaveDays)}</b></span>
    <span className="emp-leave emp-leave--other">{c.employees.leaveOther} <b>{dayText(employee.otherLeaveDays)}</b></span>
  </div>
  const statusBadge = (employee: User) => <span className={`dms-card-status ${employee.isActive ? 'is-active' : 'is-cancelled'}`}>{employee.isActive ? c.employees.active : c.employees.inactive}</span>

  return <>
    <div className="documents-heading">
      <div><h1>{title}</h1><span>{subtitle}</span></div>
      <button type="button" className="documents-primary" onClick={() => void beginCreate()}><FaPlus /> {c.employees.add}</button>
    </div>
    <div className="documents-filter-wrap">
      <div className="documents-tools documents-filter-row">
        <label className="documents-search"><FaMagnifyingGlass /><input value={query} onChange={(event) => { onQuery(event.target.value); setPage(1) }} placeholder={c.employees.search} aria-label={c.employees.searchLabel} /></label>
        <div className="documents-filter-tools">
          <button type="button" className={`documents-filter-trigger ${activeCount ? 'is-active' : ''}`} aria-expanded={filterOpen} aria-controls="documents-filter-panel" onClick={() => { setFilterOpen(!filterOpen); setDraftDepartment(departmentFilter); setDraftRole(roleFilter) }}><FaFilter/> {c.filters.filter}{activeCount > 0 && ` (${activeCount})`}</button>
          <div className="documents-view-toggle">
            <button aria-label={c.filters.cardView} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><FaTableCellsLarge /></button>
            <button aria-label={c.filters.listView} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><FaList /></button>
          </div>
          <span className="documents-stat"><FaFileLines /> {empTotal} {c.employees.count}</span>
        </div>
      </div>
      {filterOpen && <form id="documents-filter-panel" className="documents-filter-panel" onSubmit={(event) => { event.preventDefault(); applyFilters() }}>
        <label className="documents-filter-field"><span>{c.employees.departmentLabel}</span><select value={draftDepartment} onChange={(event) => setDraftDepartment(event.target.value)}><option value="all">{c.employees.allDepartments}</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
        <label className="documents-filter-field"><span>{c.employees.role}</span><select value={draftRole} onChange={(event) => setDraftRole(event.target.value)}><option value="all">{c.employees.allRoles}</option>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <div className="documents-filter-actions"><button type="button" className="documents-filter-reset" onClick={resetFilters}>{c.filters.clear}</button><button type="submit" className="documents-filter-apply">{c.filters.apply}</button></div>
      </form>}
    </div>
    {error && <div className="documents-employee-empty" role="alert">{error}</div>}
    {loading ? <div className="documents-employee-empty">{c.employees.loading}</div> : pagedUsers.length === 0 ? <div className="documents-employee-empty">{c.employees.noMatches}</div> : layout === 'grid'
      ? <div className="dms-card-grid dms-survey-grid documents-employee-grid">{pagedUsers.map((employee) => <article key={employee.id} className="dms-project-card documents-employee-card" role="button" tabIndex={0} aria-label={`${c.employees.details}: ${employee.name}`} onClick={() => openDetails(employee)} onKeyDown={(event) => activateCard(event, employee)}>
        <div className="documents-employee-card-top"><span className="documents-employee-avatar"><FaUser/></span>{statusBadge(employee)}</div>
        <h2 className="documents-employee-name">{employee.name}</h2>
        <div className="documents-employee-meta">{roleBadge(employee)}{employee.department && <> · {employee.department}</>}{employee.email && <><br/>{employee.email}</>}</div>
        {leaveChips(employee)}
      </article>)}</div>
      : <div className="dms-project-table-wrap"><table className="dms-project-table"><thead><tr><th>{c.employees.name}</th><th>{c.employees.systemRole}</th><th>{c.employees.departmentLabel}</th><th>{c.employees.email}</th><th>{c.employees.entitlements}</th><th>{c.employees.active}</th></tr></thead><tbody>{pagedUsers.map((employee) => <tr key={employee.id} role="button" tabIndex={0} onClick={() => openDetails(employee)} onKeyDown={(event) => activateCard(event, employee)}><td>{employee.name}</td><td>{roleBadge(employee)}</td><td>{employee.department ?? ''}</td><td>{employee.email}</td><td>{leaveChips(employee)}</td><td>{statusBadge(employee)}</td></tr>)}</tbody></table></div>}
    {empTotal > 0 && <PaginationFooter page={pageSafe} pageSize={pageSize} total={empTotal} labels={{ previous: c.filters.previous, next: c.filters.next, page: c.filters.page, perPage: c.filters.perPage }} onPageChange={(p: number) => setPage(Math.max(1, Math.min(p, empTotalPages)))} onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }} />}

    {createOpen && newDraft && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreateOpen(false); setSaveError('') } }}><section className="dms-modal dms-create-doc-modal documents-employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-create-title">
      <h2 className="dms-modal-title" id="employee-create-title">{c.employees.add}</h2>
      <p className="dms-modal-subtitle">{c.employees.formSubtitleAdd}</p>
      <button type="button" className="modal-close" aria-label={c.detail.close} onClick={() => { setCreateOpen(false); setSaveError('') }}><FaXmark/></button>
      <form onSubmit={create}>
        <div className="documents-employee-form-grid">
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.firstName}</span><input className="dms-form-input" required value={newDraft.firstName} onChange={(event) => setNewDraft({ ...newDraft, firstName: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.lastName}</span><input className="dms-form-input" required value={newDraft.lastName} onChange={(event) => setNewDraft({ ...newDraft, lastName: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.email}</span><input className="dms-form-input" type="email" required value={newDraft.email} onChange={(event) => setNewDraft({ ...newDraft, email: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.phone}</span><input className="dms-form-input" value={newDraft.phone} onChange={(event) => setNewDraft({ ...newDraft, phone: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.role}</span><select className="dms-form-input" value={newDraft.role} onChange={(event) => setNewDraft({ ...newDraft, role: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.departmentLabel}</span><select className="dms-form-input" value={newDraft.department} onChange={(event) => setNewDraft({ ...newDraft, department: event.target.value })}><option value="">{c.employees.noDepartment}</option>{departments.filter((department) => department.companyId === companyId).map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.password}</span><input className="dms-form-input" type="password" minLength={8} required value={newDraft.password} onChange={(event) => setNewDraft({ ...newDraft, password: event.target.value })}/></label>
        </div>
        <div className="documents-employee-form-grid"><Detail label={c.employees.company} value={companyName}/></div>
        <EmployeeProfileFields draft={newDraft} copy={c} onChange={(change) => setNewDraft((current) => current ? { ...current, ...change } : current)}/>
        <label className="documents-employee-email-toggle"><input type="checkbox" checked={newDraft.isActive} onChange={(event) => setNewDraft({ ...newDraft, isActive: event.target.checked })}/>{c.employees.active}</label>
        {saveError && <p className="documents-employee-error" role="alert">{saveError}</p>}
        <div className="documents-employee-form-actions"><button className="dms-create-btn" type="submit" disabled={saving}>{saving ? c.employees.saving : c.employees.save}</button><button className="documents-employee-toggle" type="button" onClick={() => { setCreateOpen(false); setSaveError('') }}>{c.employees.cancel}</button></div>
      </form>
    </section></div>}

    {selected && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="dms-modal dms-create-doc-modal documents-employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-details-title">
      <h2 className="dms-modal-title" id="employee-details-title">{editing ? c.employees.edit : c.employees.details}</h2>
      <p className="dms-modal-subtitle">{selected.name}{selected.department && <> · {selected.department}</>}</p>
      <button type="button" className="modal-close" aria-label={c.detail.close} onClick={close}><FaXmark/></button>
      {editing && draft ? <form onSubmit={save}>
        <div className="documents-employee-form-grid">
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.firstName}</span><input className="dms-form-input" required value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.lastName}</span><input className="dms-form-input" required value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.email}</span><input className="dms-form-input" type="email" required value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.phone}</span><input className="dms-form-input" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></label>
          <label className="dms-form-field"><span className="dms-form-label">{c.employees.role}</span><select className="dms-form-input" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}><option value={selected.role}>{selected.role}</option>{roles.filter((role) => role.name !== selected.role).map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label>
        </div>
        <div className="documents-employee-form-grid"><Detail label={c.employees.company} value={companyName}/></div>
        <EmployeeProfileFields draft={draft} departments={departments} companyId={selected.companyId} copy={c} onChange={(change) => setDraft((current) => current ? { ...current, ...change } : current)}/>
        <label className="documents-employee-email-toggle"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}/>{c.employees.active}</label>
        {saveError && <p className="documents-employee-error" role="alert">{saveError}</p>}
        <div className="documents-employee-form-actions"><button className="dms-create-btn" type="submit" disabled={saving}>{saving ? c.employees.saving : c.employees.save}</button><button className="documents-employee-toggle" type="button" onClick={() => setEditing(false)}>{c.employees.cancel}</button></div>
      </form> : <>
        <div className="documents-employee-form-grid">
          <Detail label={c.employees.name} value={selected.name}/><Detail label={c.employees.email} value={selected.email}/>
          <Detail label={c.employees.departmentLabel} value={selected.department ?? ''}/><Detail label={c.employees.role} value={selected.role}/>
          <Detail label={c.employees.phone} value={selected.phone ?? ''}/><Detail label={c.employees.company} value={selected.company}/>
          <Detail label={c.employees.code} value={selected.employeeCode ?? ''}/>
          <Detail label={c.employees.manager} value={selected.managerName ?? ''}/><Detail label={c.employees.startDate} value={selected.employmentStartDate?.slice(0, 10) ?? ''}/>
          <Detail label={c.employees.appointedDate} value={selected.appointedDate?.slice(0, 10) ?? ''}/>
          <Detail label={c.employees.active} value={selected.isActive ? c.employees.active : c.employees.inactive}/>
        </div>
        <h3 className="documents-employee-entitlement-title">{c.employees.entitlements}</h3>
        <div className="documents-employee-form-grid documents-employee-entitlements">
          <Detail label={c.leaveTypes.sick} value={selected.sickLeaveDays ?? ''}/><Detail label={c.leaveTypes.personal} value={selected.personalLeaveDays ?? ''}/>
          <Detail label={c.leaveTypes.vacation} value={selected.vacationLeaveDays ?? ''}/><Detail label={c.employees.leaveOther} value={selected.otherLeaveDays ?? ''}/>
          <Detail label={c.employees.emailNotify} value={selected.emailNotificationsEnabled === null ? '' : selected.emailNotificationsEnabled ? c.employees.active : c.employees.inactive}/>
        </div>
        {saveError && <p className="documents-employee-error" role="alert">{saveError}</p>}
        <div className="documents-employee-form-actions"><button className="dms-create-btn" type="button" onClick={beginEdit}>{c.employees.edit}</button></div>
      </>}
    </section></div>}
  </>
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return <div className="dms-form-field"><span className="dms-form-label">{label}</span><div className="documents-readonly-value">{value === undefined || value === null || value === '' ? '' : String(value)}</div></div>
}

function EmployeeProfileFields({ draft, copy: c, onChange, departments, companyId }: {
  draft: Draft
  copy: Translations['features']['documentManagement']
  onChange: (change: Partial<Draft>) => void
  departments?: Department[]
  companyId?: number
}) {
  return <>
    <div className="documents-employee-form-grid">
      <label className="dms-form-field"><span className="dms-form-label">{c.employees.code}</span><input className="dms-form-input" value={draft.employeeCode} onChange={(event) => onChange({ employeeCode: event.target.value })}/></label>
      {departments && <label className="dms-form-field"><span className="dms-form-label">{c.employees.departmentLabel}</span><select className="dms-form-input" value={draft.department} onChange={(event) => onChange({ department: event.target.value })}><option value="">{c.employees.noDepartment}</option>{departments.filter((department) => department.companyId === companyId || department.name === draft.department).map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select></label>}
      <label className="dms-form-field"><span className="dms-form-label">{c.employees.startDate}</span><input className="dms-form-input" type="date" value={draft.employmentStartDate} onChange={(event) => onChange({ employmentStartDate: event.target.value })}/></label>
      <label className="dms-form-field"><span className="dms-form-label">{c.employees.appointedDate}</span><input className="dms-form-input" type="date" value={draft.appointedDate} onChange={(event) => onChange({ appointedDate: event.target.value })}/></label>
    </div>
    <h3 className="documents-employee-entitlement-title">{c.employees.entitlements}</h3>
    <div className="documents-employee-form-grid documents-employee-entitlements">
      <NumberField label={c.leaveTypes.sick} value={draft.sickLeaveDays} onChange={(value) => onChange({ sickLeaveDays: value })}/>
      <NumberField label={c.leaveTypes.personal} value={draft.personalLeaveDays} onChange={(value) => onChange({ personalLeaveDays: value })}/>
      <NumberField label={c.leaveTypes.vacation} value={draft.vacationLeaveDays} onChange={(value) => onChange({ vacationLeaveDays: value })}/>
      <NumberField label={c.employees.leaveOther} value={draft.otherLeaveDays} onChange={(value) => onChange({ otherLeaveDays: value })}/>
    </div>
    <label className="documents-employee-email-toggle"><input type="checkbox" checked={draft.emailNotificationsEnabled} onChange={(event) => onChange({ emailNotificationsEnabled: event.target.checked })}/>{c.employees.emailNotify}</label>
  </>
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label className="dms-form-field"><span className="dms-form-label">{label}</span><input className="dms-form-input" type="number" min="0" step="0.5" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}/></label>
}