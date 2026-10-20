import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../../locales";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type Department,
  type DepartmentInput,
} from "../services/departments.service";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasAnyPermission } from "../../../../auth/permissions";
import { listPermissionModules, type PermissionModule } from "../../modules/services/modules.service";
import { listCompanies, type Company } from "../../companies/services/companies.service";

const emptyForm: DepartmentInput = {
  companyId: 0,
  name: "",
  isActive: true,
  moduleIds: [],
};

const moduleGroups = [
  { label: "ทั่วไป", keys: ["dashboard"] },
  { label: "โครงการทั้งหมด", keys: ["projects", "projects_cm", "survey"] },
  { label: "จัดการเอกสาร", keys: ["documents", "documents_pending", "documents_ledger", "report", "documents_employees", "documents_policy", "documents_notifications"] },
  { label: "ตั้งค่า", keys: ["users", "roles", "departments", "permissions", "modules", "companies", "activity_logs"] },
];

const moduleLabels: Record<string, string> = {
  dashboard: "แดชบอร์ด", projects: "PM", projects_cm: "CM", survey: "Survey",
  documents: "รายการใบลา", documents_pending: "รออนุมัติ", documents_ledger: "สมุดบันทึกการลา",
  report: "รายงานออกนอกสถานที่", documents_employees: "พนักงาน", documents_policy: "นโยบายการลา",
  documents_notifications: "แจ้งเตือน", users: "ผู้ใช้งาน", roles: "บทบาทและสิทธิ์",
  departments: "จัดการแผนก", permissions: "สิทธิ์", modules: "โมดูล", companies: "บริษัท",
  activity_logs: "บันทึกกิจกรรม",
};

export function DepartmentsSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasAnyPermission(user, "เพิ่มแผนก", "จัดการแผนก"));
  const canEdit = Boolean(user && hasAnyPermission(user, "แก้ไขแผนก", "จัดการแผนก"));
  const canDelete = Boolean(user && hasAnyPermission(user, "ลบแผนก", "จัดการแผนก"));
  const [items, setItems] = useState<Department[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  useErrorToast(error);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesSearch = !normalizedSearch || item.name.toLocaleLowerCase().includes(normalizedSearch);
    const matchesCompany = companyFilter === "all" || item.companyId === Number(companyFilter);
    const matchesStatus = statusFilter === "all" || Boolean(item.isActive) === (statusFilter === "active");
    return matchesSearch && matchesCompany && matchesStatus;
  });
  const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);
  const visibleItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [departmentsResponse, modulesResponse, companiesResponse] = await Promise.all([listDepartments(), listPermissionModules(), listCompanies()]);
      setItems(departmentsResponse.data);
      setModules(modulesResponse.data.filter((module) => Boolean(module.isActive)));
      setCompanies(companiesResponse.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
    } finally {
      setLoading(false);
    }
  }, [settingsTranslations.loadError]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [search, companyFilter, statusFilter]);

  function showForm(item?: Department) {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
            companyId: item.companyId,
            isActive: Boolean(item.isActive),
            moduleIds: item.moduleIds,
          }
        : { ...emptyForm, companyId: user?.company?.id ?? companies[0]?.id ?? 0 },
    );
    setOpen(true);
    setError("");
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await updateDepartment(editing.id, form);
      else await createDepartment(form);
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Department) {
    if (!window.confirm(`${settingsTranslations.deleteConfirm} “${item.name}” ?`)) return;
    try {
      await deleteDepartment(item.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.departmentManagement}</h1>
          <p>{settingsTranslations.departmentHelp}</p>
        </div>
        {canCreate && <button
          className="primary-button"
          type="button"
          onClick={() => showForm()}
        >
          {settingsTranslations.addDepartment}
        </button>}
      </header>
      <div className="users-toolbar">
        <input
          type="search"
          aria-label={settingsTranslations.departmentSearchPlaceholder}
          placeholder={settingsTranslations.departmentSearchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label={settingsTranslations.companyFilter} value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
          <option value="all">{settingsTranslations.allCompanies}</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <select aria-label={settingsTranslations.statusFilter} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{settingsTranslations.allStatuses}</option>
          <option value="active">{settingsTranslations.active}</option>
          <option value="inactive">{settingsTranslations.inactive}</option>
        </select>
        <span className="users-count">{filteredItems.length} {settingsTranslations.department}</span>
      </div>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.name}</th>
              <th>{settingsTranslations.company}</th>
              <th>{settingsTranslations.members}</th>
              <th>{settingsTranslations.status}</th>
              <th>{settingsTranslations.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.loading}
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.noDepartments}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label={settingsTranslations.name}>
                    <strong>{item.name}</strong>
                  </td>
                  <td data-label={settingsTranslations.company}>{item.company}</td>
                  <td data-label={settingsTranslations.members}>{item.userCount}</td>
                  <td data-label={settingsTranslations.status}>
                    <span
                      className={`status-pill ${item.isActive ? "is-active" : ""}`}
                    >
                      {item.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                    </span>
                  </td>
                  <td data-label={settingsTranslations.actions}>
                    <div className="row-actions">
                      {canEdit && <button type="button" onClick={() => showForm(item)}>
                        {translations.common.actions.edit}
                      </button>}
                      {canDelete && <button
                        className="danger-link"
                        type="button"
                        onClick={() => void remove(item)}
                      >
                        {translations.common.actions.delete}
                      </button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={filteredItems.length}
        labels={translations.common.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="user-modal department-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-form-title"
          >
            <header>
              <h2 id="department-form-title">
                {editing ? settingsTranslations.editDepartment : settingsTranslations.addDepartment}
              </h2>
              <button
                className="modal-close"
                type="button"
                aria-label={translations.common.actions.cancel}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void submit(event)}>
              <label>
                {settingsTranslations.company}
                <select required value={form.companyId || ""} onChange={(event) => setForm({ ...form, companyId: Number(event.target.value) })}>
                  <option value="" disabled>{settingsTranslations.company}</option>
                  {companies.filter((company) => Boolean(company.isActive) || company.id === form.companyId).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>
              <label>
                {settingsTranslations.name}
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                {settingsTranslations.active}
              </label>
              <fieldset className="role-permission-picker department-module-picker">
                <legend>เมนูที่แผนกมองเห็น</legend>
                <div className="role-permission-picker-grid">
                  {moduleGroups.map((group) => {
                    const groupModules = group.keys.map((key) => modules.find((module) => module.name === key)).filter((module): module is PermissionModule => Boolean(module));
                    const selectedCount = groupModules.filter((module) => form.moduleIds.includes(module.id)).length;
                    return <section className="role-permission-picker-module" key={group.label}>
                      <div className="permission-picker-module-header">
                        <h3>{group.label}</h3>
                        <label className="permission-select-all"><input type="checkbox" checked={groupModules.length > 0 && selectedCount === groupModules.length} ref={(input) => { if (input) input.indeterminate = selectedCount > 0 && selectedCount < groupModules.length }} onChange={() => {
                          const ids = groupModules.map((module) => module.id);
                          setForm({ ...form, moduleIds: selectedCount === groupModules.length ? form.moduleIds.filter((id) => !ids.includes(id)) : [...new Set([...form.moduleIds, ...ids])] });
                        }} /><span>เลือกทั้งหมดในกลุ่ม</span><small>{selectedCount}/{groupModules.length}</small></label>
                      </div>
                      {groupModules.map((module) => <label className="role-permission-option" key={module.id}>
                        <input type="checkbox" checked={form.moduleIds.includes(module.id)} onChange={() => setForm({ ...form, moduleIds: form.moduleIds.includes(module.id) ? form.moduleIds.filter((id) => id !== module.id) : [...form.moduleIds, module.id] })} />
                        <span>{moduleLabels[module.name] ?? module.name}</span>
                      </label>)}
                    </section>;
                  })}
                </div>
              </fieldset>
              <footer>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  {translations.common.actions.cancel}
                </button>
                <button
                  className="primary-button"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? settingsTranslations.saving : translations.common.actions.save}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
