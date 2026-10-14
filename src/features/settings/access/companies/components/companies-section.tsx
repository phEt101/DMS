import { type SyntheticEvent, useCallback, useEffect, useState } from 'react'
import type { Translations } from '../../../../../locales'
import { PaginationFooter } from '../../../../../components/pagination-footer'
import { useErrorToast } from '../../../../../components/toast-provider'
import { useAuth } from '../../../../auth/hooks/use-auth'
import { hasAnyPermission } from '../../../../auth/permissions'
import { createCompany, deleteCompany, listCompanies, updateCompany, type Company, type CompanyInput } from '../services/companies.service'

const blankForm: CompanyInput = { name: '', logoUrl: '', isActive: true }

export function CompaniesSection({ translations }: { translations: Translations }) {
  const copy = translations.features.settingsUser
  const { user, refreshUser } = useAuth()
  const canCreate = Boolean(user && hasAnyPermission(user, 'เพิ่มบริษัท', 'จัดการบริษัท'))
  const canEdit = Boolean(user && hasAnyPermission(user, 'แก้ไขบริษัท', 'จัดการบริษัท'))
  const canDelete = Boolean(user && hasAnyPermission(user, 'ลบบริษัท', 'จัดการบริษัท'))
  const [items, setItems] = useState<Company[]>([])
  const [editing, setEditing] = useState<Company | null>(null)
  const [form, setForm] = useState(blankForm)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  useErrorToast(error)
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1)
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setItems((await listCompanies()).data) }
    catch (caught) { setError(caught instanceof Error ? caught.message : copy.companyLoadError) }
    finally { setLoading(false) }
  }, [copy.companyLoadError])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function showForm(company?: Company) {
    setEditing(company ?? null)
    setForm(company ? { name: company.name, logoUrl: company.logoUrl ?? '', isActive: Boolean(company.isActive) } : blankForm)
    setError(''); setOpen(true)
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await updateCompany(editing.id, form)
      else await createCompany(form)
      await refreshUser()
      setOpen(false); await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : copy.companySaveError) }
    finally { setSaving(false) }
  }
  async function remove(company: Company) {
    if (!window.confirm(`${copy.deleteCompanyConfirm} “${company.name}” ?`)) return
    setError('')
    try { await deleteCompany(company.id); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : copy.deleteCompanyError) }
  }

  return <div className="management-panel">
    <header className="management-header"><div><h1>{copy.companyManagement}</h1><p>{copy.companyHelp}</p></div>{canCreate && <button className="primary-button" type="button" onClick={() => showForm()}>{copy.addCompany}</button>}</header>
    <div className="users-table-wrap"><table className="users-table"><thead><tr><th>{copy.company}</th><th>{copy.companyLogo}</th><th>{copy.members}</th><th>{copy.status}</th><th>{copy.actions}</th></tr></thead>
      <tbody>{loading ? <tr><td className="table-message" colSpan={5}>{copy.loading}</td></tr> : items.length === 0 ? <tr><td className="table-message" colSpan={5}>{copy.noCompanies}</td></tr> : visibleItems.map((company) => <tr key={company.id}>
        <td data-label={copy.company}><strong>{company.name}</strong></td>
        <td data-label={copy.companyLogo}>{company.logoUrl ? <img className="company-logo-preview" src={company.logoUrl} alt={`${company.name} logo`}/> : <span>—</span>}</td>
        <td data-label={copy.members}>{company.userCount}</td>
        <td data-label={copy.status}><span className={`status-pill ${company.isActive ? 'is-active' : ''}`}>{company.isActive ? copy.active : copy.inactive}</span></td>
        <td data-label={copy.actions}><div className="row-actions">{canEdit && <button type="button" onClick={() => showForm(company)}>{translations.common.actions.edit}</button>}{canDelete && <button type="button" className="danger-link" onClick={() => void remove(company)}>{translations.common.actions.delete}</button>}</div></td>
      </tr>)}</tbody>
    </table></div>
    <PaginationFooter page={page} pageSize={pageSize} total={items.length} labels={translations.common.pagination} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}/>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="company-form-title">
      <header><div><p className="feature-kicker">{editing ? translations.common.actions.edit : copy.addCompany}</p><h2 id="company-form-title">{editing ? editing.name : copy.newCompany}</h2></div><button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label={translations.common.actions.cancel}>×</button></header>
      <form onSubmit={(event) => void submit(event)}>
        <label>{copy.company}<input required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
        <label>{copy.companyLogo}<input type="url" maxLength={2048} placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}/><small>{copy.companyLogoHelp}</small></label>
        {form.logoUrl && <img className="company-logo-preview company-logo-preview--large" src={form.logoUrl} alt={copy.companyLogo} />}
        <label className="checkbox-field"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })}/>{copy.active}</label>
        <footer><button className="secondary-button" type="button" onClick={() => setOpen(false)}>{translations.common.actions.cancel}</button><button className="primary-button" disabled={saving} type="submit">{saving ? copy.saving : translations.common.actions.save}</button></footer>
      </form>
    </section></div>}
  </div>
}
