import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { FaFileLines, FaFilter, FaList, FaMagnifyingGlass, FaPlus, FaTableCellsLarge, FaUser, FaXmark } from 'react-icons/fa6'
import { PaginationFooter } from '../../../../components/pagination-footer'
import { createUser, updateUser, uploadUserAvatar, deleteUserAvatar, type User } from '../../../settings/users/services/users.service'
import { listDepartments, type Department } from '../../../settings/access/departments/services/departments.service'
import { listRoles, type Role } from '../../../settings/access/roles/services/roles.service'
import type { Translations } from '../../../../locales'
import { avatarSrc } from '../../../../services/avatar'
import { useToast } from '../../../../components/toast-provider'
import { useAuth } from '../../../auth/hooks/use-auth'
import { hasPermission } from '../../../auth/permissions'
import type { ApiPerson } from '../../services/employee-requests.service'
import { formatLeaveDayHour } from '../../leave-duration'

type Props = {
  users: User[]
  leaveBalances: ApiPerson[]
  hoursPerDay: number
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
  phone: string; department: string; isActive: boolean; employeeCode: string;
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
const nameInitials = (name: string) => name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase()

export default function DocDatabaseEmployeesPanel({ users, leaveBalances, hoursPerDay, title, subtitle, companyId, companyName, loading, error, query, onQuery, onUpdated, onCreated, copy: c }: Props) {
  const { showToast } = useToast()
  const { user: authenticatedUser, refreshUser } = useAuth()
  // สิทธิ์แก้ไขพนักงาน: admin / สิทธิ์ "สร้าง-แก้ไขผู้ใช้งาน" / แผนกเข้าถึงโมดูล users หรือ documents_employees
  // (ตรงกับ requireDepartmentModule("users") ของ backend — HR Div. ที่เห็นโมดูล "พนักงาน" ในหน้าจัดการแผนกจะแก้ไขได้)
  const canEditEmployees = Boolean(
    authenticatedUser && (
      authenticatedUser.role.name.trim().toLowerCase() === 'admin' ||
      hasPermission(authenticatedUser, 'สร้างผู้ใช้งาน') ||
      hasPermission(authenticatedUser, 'แก้ไขผู้ใช้งาน') ||
      authenticatedUser.departmentModules.includes('users') ||
      authenticatedUser.departmentModules.includes('documents_employees')
    ),
  )
  const [selected, setSelected] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  // สิทธิ์แก้ไข = false → ซ่อนปุ่มแก้ไข/ฟอร์ม และล็อกการเปลี่ยนรูป (โหมดดูอย่างเดียว)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [newDraft, setNewDraft] = useState<NewDraft | null>(null)
  // รูปโปรไฟล์: เลือกไฟล์/ลบเป็นแค่ "ร่าง" — อัปโหลด/ลบจริงตอนกดบันทึกเท่านั้น
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemove, setAvatarRemove] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  // เปิดดูรูปโปรไฟล์แบบเต็มจอ (lightbox เหมือนหน้ารายละเอียดเอกสาร)
  const [zoomAvatar, setZoomAvatar] = useState<{ src: string; name: string } | null>(null)
  const zoom = (src: string, name: string) => setZoomAvatar({ src, name })
  // filter แบบหน้าจัดการเอกสาร: ปุ่ม Filter เปิดแผ่นกรองแผนก/บทบาท (apply/reset)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [draftDepartment, setDraftDepartment] = useState('all')
  const [draftRole, setDraftRole] = useState('all')
  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => user.department).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b)),
    [users]
  )
  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => user.role).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b)),
    [users]
  )
  const matches = useMemo(() => users.filter((user) => {
    if (query && !`${user.name} ${user.email} ${user.department ?? ''} ${user.role}`.toLocaleLowerCase('th').includes(query.toLocaleLowerCase('th'))) return false
    if (departmentFilter !== 'all' && (user.department ?? '') !== departmentFilter) return false
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    return true
  }), [users, query, departmentFilter, roleFilter])

  const openDetails = (user: User) => { setSelected(user); setEditing(false); setSaveError(''); setAvatarFile(null); setAvatarRemove(false) }
  const close = () => { setSelected(null); setEditing(false); setDraft(null); setSaveError(''); setAvatarFile(null); setAvatarRemove(false) }
  const beginCreate = async () => {
    setSelected(null)
    setEditing(false)
    setSaveError('')
    setAvatarFile(null)
    setAvatarRemove(false)
    setNewDraft({ firstName: '', lastName: '', email: '', phone: '', role: 'user', department: '', isActive: true, employeeCode: '', employmentStartDate: '', appointedDate: '', sickLeaveDays: 30, personalLeaveDays: 3, vacationLeaveDays: 3, otherLeaveDays: 1, emailNotificationsEnabled: false, password: '' })
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
    setDraft({ firstName: selected.firstName, lastName: selected.lastName, email: selected.email, phone: selected.phone ?? '', role: selected.role, department: selected.department ?? '', isActive: Boolean(selected.isActive), employeeCode: selected.employeeCode ?? '', employmentStartDate: selected.employmentStartDate?.slice(0, 10) ?? '', appointedDate: selected.appointedDate?.slice(0, 10) ?? '', sickLeaveDays: selected.sickLeaveDays, personalLeaveDays: selected.personalLeaveDays, vacationLeaveDays: selected.vacationLeaveDays, otherLeaveDays: selected.otherLeaveDays, emailNotificationsEnabled: Boolean(selected.emailNotificationsEnabled) })
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
      let updated = selected
      const response = await updateUser(selected.id, draft)
      updated = response.data
      // รูปโปรไฟล์: อัปโหลด/ลบจริง "หลัง" บันทึกข้อมูลสำเร็จ (ลบก่อนแล้วค่อยอัปโหลด)
      if (avatarRemove) {
        await deleteUserAvatar(selected.id)
        updated = { ...updated, avatarUrl: null }
      } else if (avatarFile) {
        const avatarResponse = await uploadUserAvatar(selected.id, avatarFile)
        updated = { ...updated, avatarUrl: avatarResponse.data.avatarUrl }
      }
      // แก้โปรไฟล์ตัวเอง → ดึงข้อมูล user ใหม่จาก server ให้ Topbar (ชื่อ/รูป) เปลี่ยนทันที
      // เหมือนหน้าจัดการผู้ใช้งาน (users-section) — ไม่ต้องออกจากหน้า/รีเฟรชเบราว์เซอร์
      if (selected.id === authenticatedUser?.id) await refreshUser()
      onUpdated(updated)
      setSelected(updated)
      setEditing(false)
      setAvatarFile(null)
      setAvatarRemove(false)
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
      let created = response.data
      // เพิ่มพนักงานสำเร็จ → อัปโหลดรูปโปรไฟล์ (ถ้ามีเลือกไว้)
      if (avatarFile) {
        try {
          const avatarResponse = await uploadUserAvatar(created.id, avatarFile)
          created = { ...created, avatarUrl: avatarResponse.data.avatarUrl }
          onCreated(created)
        } catch (avatarCaught) {
          // บัญชีสร้างแล้ว — แจ้งว่ารูปอัปโหลดไม่สำเร็จแต่ไม่ทำข้อมูลหาย
          onCreated(created)
          setSaveError(avatarCaught instanceof Error ? avatarCaught.message : c.employees.avatarError)
        }
      } else {
        onCreated(created)
      }
      setAvatarFile(null)
      setCreateOpen(false)
      setNewDraft(null)
      setSelected(created)
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
  // ปิดแผ่นกรองเมื่อคลิกด้านนอก
  const filterWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!filterOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!filterWrapRef.current?.contains(event.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [filterOpen])
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
  const handleAvatarUpdated = (updated: User) => {
    onUpdated(updated)
    setSelected((current) => current && current.id === updated.id ? updated : current)
  }
  const leaveBalanceText = (employee: User, type: 'sick' | 'personal' | 'vacation') => {
    const total = employee[`${type}LeaveDays`]
    const leaveUsage = leaveBalances.find((person) => person.id === employee.id)
    const used = leaveUsage?.[`${type}Used`]
    const pending = leaveUsage?.[`${type}Pending`]
    if (total === null || total === undefined) return dayText(total)
    if (used === null || used === undefined || pending === null || pending === undefined) {
      return formatLeaveDayHour(total, hoursPerDay)
    }
    const format = (days: number) => formatLeaveDayHour(days, hoursPerDay)
    return `${format(Math.max(0, total - used - pending))}/${format(total)}`
  }
  const leaveChips = (employee: User) => <div className="emp-leaves">
    <span className="emp-leave emp-leave--sick">{c.leaveTypes.sick} <b>{leaveBalanceText(employee, 'sick')}</b></span>
    <span className="emp-leave emp-leave--personal">{c.leaveTypes.personal} <b>{leaveBalanceText(employee, 'personal')}</b></span>
    <span className="emp-leave emp-leave--vacation">{c.leaveTypes.vacation} <b>{leaveBalanceText(employee, 'vacation')}</b></span>
    <span className="emp-leave emp-leave--other">{c.employees.leaveOther} <b>{dayText(employee.otherLeaveDays)}</b></span>
  </div>
  const statusBadge = (employee: User) => <span className={`dms-card-status ${employee.isActive ? 'is-active' : 'is-cancelled'}`}>{employee.isActive ? c.employees.active : c.employees.inactive}</span>

  return <>
    <div className="documents-heading">
      <div><h1>{title}</h1><span>{subtitle}</span></div>
      {canEditEmployees && <button type="button" className="documents-primary" onClick={() => void beginCreate()}><FaPlus /> {c.employees.add}</button>}
    </div>
    <div className="documents-filter-wrap" ref={filterWrapRef}>
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
      ? <div className="dms-card-grid dms-survey-grid documents-employee-grid">{pagedUsers.map((employee) => <button key={employee.id} type="button" className="dms-project-card documents-employee-card" aria-label={`${c.employees.details}: ${employee.name}`} onClick={() => openDetails(employee)} onKeyDown={(event) => activateCard(event, employee)}>
        <div className="documents-employee-card-top"><EmployeeAvatar employee={employee} onZoom={zoom}/>{statusBadge(employee)}</div>
        <h2 className="documents-employee-name">{employee.name}</h2>
        <div className="documents-employee-meta">{roleBadge(employee)}{employee.department && <> · {employee.department}</>}{employee.email && <><br/>{employee.email}</>}</div>
        {leaveChips(employee)}
      </button>)}</div>
      : <div className="dms-project-table-wrap"><table className="dms-project-table"><thead><tr><th>{c.employees.name}</th><th>{c.employees.systemRole}</th><th>{c.employees.departmentLabel}</th><th>{c.employees.email}</th><th>{c.employees.entitlements}</th><th>{c.employees.active}</th></tr></thead><tbody>{pagedUsers.map((employee) => <tr key={employee.id} tabIndex={0} onClick={() => openDetails(employee)} onKeyDown={(event) => activateCard(event, employee)}><td>{employee.name}</td><td>{roleBadge(employee)}</td><td>{employee.department ?? ''}</td><td>{employee.email}</td><td>{leaveChips(employee)}</td><td>{statusBadge(employee)}</td></tr>)}</tbody></table></div>}
    {empTotal > 0 && <PaginationFooter page={pageSafe} pageSize={pageSize} total={empTotal} labels={{ previous: c.filters.previous, next: c.filters.next, page: c.filters.page, perPage: c.filters.perPage }} onPageChange={(p: number) => setPage(Math.max(1, Math.min(p, empTotalPages)))} onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }} />}

    {createOpen && newDraft && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreateOpen(false); setSaveError('') } }}><section className="dms-modal dms-create-doc-modal documents-employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-create-title">
      <h2 className="dms-modal-title" id="employee-create-title">{c.employees.add}</h2>
      <p className="dms-modal-subtitle">{c.employees.formSubtitleAdd}</p>
      <button type="button" className="modal-close" aria-label={c.detail.close} onClick={() => { setCreateOpen(false); setSaveError('') }}><FaXmark/></button>
      <form onSubmit={create}>
        {/* รูปโปรไฟล์อยู่อันดับแรกของฟอร์มเพิ่มพนักงาน (เหมือนฟอร์มแก้ไข) */}
        <EmployeeAvatarField employee={null} copy={c} pendingFile={avatarFile} onPickFile={setAvatarFile} pendingRemove={false} onToggleRemove={() => {}} uploading={saving}/>
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
      {/* โหมดดู: แสดงรูปแบบอ่านอย่างเดียว (ห้ามเปลี่ยน/ลบ) — เปลี่ยนรูปทำได้เฉพาะในโหมดแก้ไข */}
      {editing && draft
        ? <EmployeeAvatarField employee={selected} copy={c} pendingFile={avatarFile} onPickFile={setAvatarFile} pendingRemove={avatarRemove} onToggleRemove={setAvatarRemove} uploading={saving}/>
        : <div className="documents-employee-avatar-field is-readonly"><EmployeeAvatar employee={selected} onZoom={zoom}/></div>}
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
          <Detail label={c.employees.startDate} value={selected.employmentStartDate?.slice(0, 10) ?? ''}/>
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
        {canEditEmployees && <div className="documents-employee-form-actions"><button className="dms-create-btn" type="button" onClick={beginEdit}>{c.employees.edit}</button></div>}
      </>}
    </section></div>}
    {zoomAvatar && <div className="documents-avatar-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomAvatar(null) }}>
      <button type="button" className="modal-close documents-avatar-lightbox-close" aria-label={c.detail.close} onClick={() => setZoomAvatar(null)}>×</button>
      <img src={zoomAvatar.src} alt={zoomAvatar.name} />
      <strong>{zoomAvatar.name}</strong>
    </div>}
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

// ---------- รูปโปรไฟล์พนักงาน (avatar) ----------
const empInitials = (name: string | null | undefined) => (name ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .map((word) => word[0])
  .slice(0, 2)
  .join('')
  .toUpperCase()

// รูปในการ์ดรายชื่อ: แสดงรูปจริงถ้ามี ไม่มีแสดงตัวย่อชื่อ — คลิกเพื่อเปิดดูแบบเต็มจอ
export function EmployeeAvatar({ employee, name, onZoom }: { employee: User; name?: string; onZoom?: (src: string, name: string) => void }) {
  const shown = avatarSrc(employee.avatarUrl)
  if (!shown) return <span className="documents-employee-avatar">{empInitials(name ?? employee.name) || <FaUser/>}</span>
  return onZoom
    ? <button type="button" className="documents-employee-avatar documents-employee-avatar--image" title={name ?? employee.name} onClick={(event) => { event.stopPropagation(); onZoom(shown, name ?? employee.name) }}><img src={shown} alt={name ?? employee.name}/></button>
    : <span className="documents-employee-avatar documents-employee-avatar--image"><img src={shown} alt={name ?? employee.name}/></span>
}

// ช่องรูปโปรไฟล์ในฟอร์ม: เลือกไฟล์/ลบเป็นแค่ "ร่าง" — อัปโหลด/ลบจริง "หลัง" กดบันทึกข้อมูลสำเร็จเท่านั้น
// - พรีวิวทันทีจากไฟล์ที่เลือก (URL.createObjectURL) ไม่ยิง API
// - pendingRemove: ทำเครื่องหมายว่าจะลบ — กดบันทึกแล้วค่อยลบจริง
function EmployeeAvatarField({ employee, copy: c, pendingFile, onPickFile, pendingRemove, onToggleRemove, uploading }: {
  employee: User | null;
  copy: Translations['features']['documentManagement'];
  pendingFile: File | null;
  onPickFile: (file: File | null) => void;
  pendingRemove: boolean;
  onToggleRemove: (remove: boolean) => void;
  uploading: boolean;
}) {
  const previewFile = pendingFile ? URL.createObjectURL(pendingFile) : null
  const shown = previewFile ?? avatarSrc(pendingRemove ? null : employee?.avatarUrl)
  return <div className="documents-employee-avatar-field">
    <span className="documents-employee-avatar-field-preview">
      {shown
        ? <img className="documents-employee-avatar documents-employee-avatar--image" src={shown} alt={c.employees.avatar}/>
        : <span className="documents-employee-avatar">{empInitials(employee?.name) || <FaUser/>}</span>}
    </span>
    <label className="documents-employee-avatar-field-input">
      {c.employees.avatar}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { onPickFile(event.target.files?.[0] ?? null); if (event.target.files?.[0]) onToggleRemove(false); event.target.value = '' }}/>
      {pendingFile ? <small>{c.employees.avatarReplace}</small> : !employee?.avatarUrl && <small>{c.employees.avatarNone}</small>}
    </label>
    {employee?.avatarUrl && !pendingFile && <button type="button" className={`documents-employee-avatar-remove${pendingRemove ? ' is-pending' : ''}`} onClick={() => { onPickFile(null); onToggleRemove(!pendingRemove) }}>{pendingRemove ? c.employees.avatarKeep : c.employees.avatarRemove}</button>}
  </div>
}
