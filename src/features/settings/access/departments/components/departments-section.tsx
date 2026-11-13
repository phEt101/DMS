import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../../locales";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  updateCompanyDepartmentModules,
  type Department,
  type DepartmentInput,
} from "../services/departments.service";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasAnyPermission } from "../../../../auth/permissions";
import { listPermissionModules, type PermissionModule } from "../../modules/services/modules.service";
import { moduleLabels, permissionModuleGroupDefinitions } from "../../modules/module-groups";
import { defaultModuleIconNames, getModuleIcon } from "../../modules/module-icons";
import { listCompanies, type Company } from "../../companies/services/companies.service";
import { ActiveStatusControl } from "../../../components/active-status-control";

const emptyForm: DepartmentInput = {
  companyId: 0,
  name: "",
  isActive: true,
  moduleIds: [],
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
  const [bulkAccessOpen, setBulkAccessOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkDepartmentIds, setBulkDepartmentIds] = useState<number[]>([]);
  const [bulkDepartmentSearch, setBulkDepartmentSearch] = useState("");
  const [bulkModuleIds, setBulkModuleIds] = useState<number[]>([]);
  const [bulkModuleSearch, setBulkModuleSearch] = useState("");
  const [bulkModuleVisible, setBulkModuleVisible] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleSearch, setModuleSearch] = useState("");
  const [showSelectedModules, setShowSelectedModules] = useState(false);
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
    if (bulkCompanyId || companies.length === 0) return;
    const company = companies.find((item) => item.id === user?.company?.id)
      ?? companies.find((item) => Boolean(item.isActive))
      ?? companies[0];
    if (company) setBulkCompanyId(String(company.id));
  }, [bulkCompanyId, companies, user?.company?.id]);
  useEffect(() => {
    setPage(1);
  }, [search, companyFilter, statusFilter]);

  function showForm(item?: Department) {
    setEditing(item ?? null);
    setModuleSearch("");
    setShowSelectedModules(false);
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

  async function applyBulkModuleAccess() {
    const companyId = Number(bulkCompanyId);
    const company = companies.find((item) => item.id === companyId);
    const departmentIds = items
      .filter((item) => item.companyId === companyId && bulkDepartmentIds.includes(item.id))
      .map((item) => item.id);
    const selectedModules = modules.filter((module) => bulkModuleIds.includes(module.id) && module.name !== "activity_logs");
    const moduleIds = selectedModules.map((module) => module.id);
    if (!company) return;
    if (departmentIds.length === 0) {
      setError(settingsTranslations.bulkAccessNoDepartments);
      return;
    }
    if (moduleIds.length === 0) {
      setError(settingsTranslations.bulkAccessNoModules);
      return;
    }

    const action = bulkModuleVisible ? settingsTranslations.bulkAccessShow : settingsTranslations.bulkAccessHide;
    const confirmation = settingsTranslations.bulkAccessConfirm
      .replace("{action}", action)
      .replace("{company}", company.name)
      .replace("{departmentCount}", String(departmentIds.length))
      .replace("{moduleCount}", String(moduleIds.length));
    if (!window.confirm(confirmation)) return;

    setBulkSaving(true);
    setError("");
    setBulkResult("");
    try {
      const { data } = await updateCompanyDepartmentModules({ companyId, departmentIds, moduleIds, enabled: bulkModuleVisible });
      setBulkResult(settingsTranslations.bulkAccessSuccess
        .replace("{company}", data.companyName)
        .replace("{departmentCount}", String(data.departmentCount))
        .replace("{moduleCount}", String(data.moduleCount)));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setBulkSaving(false);
    }
  }

  const moduleGroups = permissionModuleGroupDefinitions.map((group) => ({
    label: settingsTranslations[group.labelKey],
    keys: [...group.keys],
  }));
  const knownModuleNames = new Set(moduleGroups.flatMap((group) => group.keys));
  const ungroupedModules = modules.filter((module) => !knownModuleNames.has(module.name));
  const pickerGroups: Array<{ label: string; keys: string[] }> = ungroupedModules.length
    ? [...moduleGroups, { label: settingsTranslations.otherModules, keys: ungroupedModules.map((module) => module.name) }]
    : moduleGroups;
  const moduleQuery = moduleSearch.trim().toLocaleLowerCase();
  const moduleLabel = (module: PermissionModule) =>
    settingsTranslations.permissionModules[module.name as keyof typeof settingsTranslations.permissionModules] ?? moduleLabels[module.name] ?? module.name;
  const bulkCompanyDepartments = items.filter((department) => department.companyId === Number(bulkCompanyId));
  const departmentQuery = bulkDepartmentSearch.trim().toLocaleLowerCase();
  const visibleBulkDepartments = bulkCompanyDepartments.filter((department) =>
    !departmentQuery || department.name.toLocaleLowerCase().includes(departmentQuery),
  );
  const selectedBulkDepartmentCount = bulkCompanyDepartments.filter((department) => bulkDepartmentIds.includes(department.id)).length;
  const areVisibleDepartmentsSelected = visibleBulkDepartments.length > 0
    && visibleBulkDepartments.every((department) => bulkDepartmentIds.includes(department.id));
  const eligibleBulkModules = modules.filter((module) => module.name !== "activity_logs");
  const bulkModuleQuery = bulkModuleSearch.trim().toLocaleLowerCase();
  const filteredBulkModuleGroups = pickerGroups.flatMap((group) => {
    const groupModules = eligibleBulkModules.filter((module) => group.keys.includes(module.name));
    const groupMatches = bulkModuleQuery && group.label.toLocaleLowerCase().includes(bulkModuleQuery);
    const visibleModules = groupModules.filter((module) =>
      !bulkModuleQuery || groupMatches ||
      module.name.toLocaleLowerCase().includes(bulkModuleQuery) ||
      moduleLabel(module).toLocaleLowerCase().includes(bulkModuleQuery),
    );
    return visibleModules.length ? [{ group, visibleModules }] : [];
  });
  const selectedBulkModuleCount = eligibleBulkModules.filter((module) => bulkModuleIds.includes(module.id)).length;
  const filteredPickerGroups = pickerGroups.flatMap((group) => {
    const allGroupModules = modules.filter((module) => group.keys.includes(module.name));
    const groupMatches = moduleQuery && group.label.toLocaleLowerCase().includes(moduleQuery);
    const visibleModules = allGroupModules.filter((module) => {
      const matchesSearch = !moduleQuery || groupMatches ||
        module.name.toLocaleLowerCase().includes(moduleQuery) ||
        moduleLabel(module).toLocaleLowerCase().includes(moduleQuery);
      return matchesSearch && (!showSelectedModules || form.moduleIds.includes(module.id));
    });
    return visibleModules.length ? [{ group, allGroupModules, visibleModules }] : [];
  });
  const selectedModuleCount = modules.filter((module) => form.moduleIds.includes(module.id)).length;

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.departmentManagement}</h1>
          <p>{settingsTranslations.departmentHelp}</p>
        </div>
        {(canCreate || canEdit) && <div className="management-header-actions">
          {canEdit && <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setBulkResult("");
              setBulkDepartmentIds([]);
              setBulkModuleIds([]);
              setBulkDepartmentSearch("");
              setBulkModuleSearch("");
              setBulkModuleVisible(true);
              setBulkAccessOpen(true);
            }}
          >
            {settingsTranslations.bulkAccessTitle}
          </button>}
          {canCreate && <button
            className="primary-button"
            type="button"
            onClick={() => showForm()}
          >
            {settingsTranslations.addDepartment}
          </button>}
        </div>}
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
      {bulkAccessOpen && canEdit && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !bulkSaving) setBulkAccessOpen(false);
          }}
        >
          <section className="user-modal department-modal module-display-modal department-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="department-bulk-title">
            <header>
              <div>
                <h2 id="department-bulk-title">{settingsTranslations.bulkAccessTitle}</h2>
                <p className="module-display-subtitle">{settingsTranslations.bulkAccessHelp}</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label={settingsTranslations.closeModuleDisplay}
                disabled={bulkSaving}
                onClick={() => setBulkAccessOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="module-display-content">
              <div className="department-bulk-company">
                <label>
                  {settingsTranslations.bulkAccessCompany}
                  <select value={bulkCompanyId} disabled={bulkSaving} onChange={(event) => {
                    setBulkCompanyId(event.target.value);
                    setBulkDepartmentIds([]);
                    setBulkDepartmentSearch("");
                    setBulkResult("");
                  }}>
                    <option value="">{settingsTranslations.bulkAccessSelectCompany}</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </label>
              </div>
              <section className="department-bulk-departments">
                <div className="permission-picker-module-header module-display-group-header">
                  <h3>{settingsTranslations.bulkAccessDepartments}</h3>
                  <small>{settingsTranslations.bulkAccessDepartmentCount
                    .replace("{selected}", String(selectedBulkDepartmentCount))
                    .replace("{total}", String(bulkCompanyDepartments.length))}</small>
                </div>
                <div className="department-bulk-department-toolbar">
                  <input
                    type="search"
                    aria-label={settingsTranslations.bulkAccessDepartmentSearch}
                    placeholder={settingsTranslations.bulkAccessDepartmentSearch}
                    value={bulkDepartmentSearch}
                    disabled={bulkSaving}
                    onChange={(event) => setBulkDepartmentSearch(event.target.value)}
                  />
                  <label className="permission-select-all">
                    <input
                      type="checkbox"
                      checked={areVisibleDepartmentsSelected}
                      ref={(input) => {
                        if (input) {
                          const selectedCount = visibleBulkDepartments.filter((department) => bulkDepartmentIds.includes(department.id)).length;
                          input.indeterminate = selectedCount > 0 && selectedCount < visibleBulkDepartments.length;
                        }
                      }}
                      disabled={bulkSaving || visibleBulkDepartments.length === 0}
                      onChange={() => {
                        const visibleIds = visibleBulkDepartments.map((department) => department.id);
                        setBulkDepartmentIds((current) => areVisibleDepartmentsSelected
                          ? current.filter((id) => !visibleIds.includes(id))
                          : [...new Set([...current, ...visibleIds])]);
                        setBulkResult("");
                      }}
                    />
                    <span>{settingsTranslations.bulkAccessSelectAllDepartments}</span>
                  </label>
                </div>
                <div className="department-bulk-department-list">
                  {visibleBulkDepartments.map((department) => (
                    <label className="department-bulk-department-option" key={department.id}>
                      <input
                        type="checkbox"
                        checked={bulkDepartmentIds.includes(department.id)}
                        disabled={bulkSaving}
                        onChange={() => {
                          setBulkDepartmentIds((current) => current.includes(department.id)
                            ? current.filter((id) => id !== department.id)
                            : [...current, department.id]);
                          setBulkResult("");
                        }}
                      />
                      <span>{department.name}</span>
                    </label>
                  ))}
                  {visibleBulkDepartments.length === 0 && <p className="permission-search-empty">{settingsTranslations.noDepartments}</p>}
                </div>
              </section>
              <fieldset className="department-bulk-action">
                <legend>{settingsTranslations.bulkAccessAction}</legend>
                <label>
                  <input
                    type="radio"
                    name="department-bulk-action"
                    checked={bulkModuleVisible}
                    disabled={bulkSaving}
                    onChange={() => {
                      setBulkModuleVisible(true);
                      setBulkResult("");
                    }}
                  />
                  {settingsTranslations.bulkAccessShow}
                </label>
                <label>
                  <input
                    type="radio"
                    name="department-bulk-action"
                    checked={!bulkModuleVisible}
                    disabled={bulkSaving}
                    onChange={() => {
                      setBulkModuleVisible(false);
                      setBulkResult("");
                    }}
                  />
                  {settingsTranslations.bulkAccessHide}
                </label>
              </fieldset>
              <h3 className="department-bulk-module-title">{settingsTranslations.bulkAccessModule}</h3>
              <div className="module-display-toolbar">
                <input
                  type="search"
                  aria-label={settingsTranslations.bulkAccessModuleSearch}
                  placeholder={settingsTranslations.bulkAccessModuleSearch}
                  value={bulkModuleSearch}
                  disabled={bulkSaving}
                  onChange={(event) => setBulkModuleSearch(event.target.value)}
                />
                <span>{settingsTranslations.bulkAccessModuleCount
                  .replace("{selected}", String(selectedBulkModuleCount))
                  .replace("{total}", String(eligibleBulkModules.length))}</span>
              </div>
              <div className="role-permission-picker-grid module-display-grid">
                {filteredBulkModuleGroups.map(({ group, visibleModules }) => {
                  const visibleIds = visibleModules.map((module) => module.id);
                  const selectedCount = visibleModules.filter((module) => bulkModuleIds.includes(module.id)).length;
                  return <section className="role-permission-picker-module" key={group.label}>
                    <div className="permission-picker-module-header module-display-group-header">
                      <h3>{group.label}</h3>
                      <label className="permission-select-all">
                        <input
                          type="checkbox"
                          checked={visibleIds.length > 0 && selectedCount === visibleIds.length}
                          ref={(input) => {
                            if (input) input.indeterminate = selectedCount > 0 && selectedCount < visibleIds.length;
                          }}
                          disabled={bulkSaving}
                          onChange={() => {
                            setBulkModuleIds((current) => selectedCount === visibleIds.length
                              ? current.filter((id) => !visibleIds.includes(id))
                              : [...new Set([...current, ...visibleIds])]);
                            setBulkResult("");
                          }}
                        />
                        <span>{settingsTranslations.selectAllModuleGroup}</span>
                      </label>
                    </div>
                    {visibleModules.map((module) => {
                      const ModuleIcon = getModuleIcon(module.iconName || defaultModuleIconNames[module.name]);
                      const enabledDepartmentCount = bulkCompanyDepartments.filter(
                        (department) => bulkDepartmentIds.includes(department.id) && department.moduleIds.includes(module.id),
                      ).length;
                      return <div className="module-display-row" key={module.id}>
                        <label className="department-bulk-module-option">
                          <input
                            type="checkbox"
                            checked={bulkModuleIds.includes(module.id)}
                            disabled={bulkSaving}
                            onChange={() => {
                              setBulkModuleIds((current) => current.includes(module.id)
                                ? current.filter((id) => id !== module.id)
                                : [...current, module.id]);
                              setBulkResult("");
                            }}
                          />
                          <ModuleIcon aria-hidden="true" />
                          <span>{moduleLabel(module)}</span>
                          <small>{module.sortOrder}</small>
                          <span className={`status-pill${selectedBulkDepartmentCount > 0 && enabledDepartmentCount === selectedBulkDepartmentCount ? " is-active" : ""}`}>
                            {settingsTranslations.bulkAccessCurrentVisibility
                              .replace("{visible}", String(enabledDepartmentCount))
                              .replace("{total}", String(selectedBulkDepartmentCount))}
                          </span>
                        </label>
                      </div>;
                    })}
                  </section>;
                })}
                {filteredBulkModuleGroups.length === 0 && <p className="permission-search-empty">{settingsTranslations.noModules}</p>}
              </div>
              {bulkResult && <p className="department-bulk-result" role="status">{bulkResult}</p>}
              <footer className="module-display-footer">
                <button className="secondary-button" type="button" disabled={bulkSaving} onClick={() => setBulkAccessOpen(false)}>
                  {translations.common.actions.cancel}
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={bulkSaving || !bulkCompanyId || bulkDepartmentIds.length === 0 || bulkModuleIds.length === 0}
                  onClick={() => void applyBulkModuleAccess()}
                >
                  {bulkSaving ? settingsTranslations.saving : settingsTranslations.bulkAccessApply}
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
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
              <ActiveStatusControl
                active={form.isActive}
                statusLabel={settingsTranslations.status}
                activeLabel={settingsTranslations.active}
                inactiveLabel={settingsTranslations.inactive}
                onChange={(isActive) => setForm({ ...form, isActive })}
              />
              <fieldset className="role-permission-picker department-module-picker">
                <legend>เมนูที่แผนกมองเห็น</legend>
                <div className="department-module-toolbar">
                  <input
                    className="department-module-search"
                    type="search"
                    aria-label={settingsTranslations.departmentModuleSearchPlaceholder}
                    placeholder={settingsTranslations.departmentModuleSearchPlaceholder}
                    value={moduleSearch}
                    onChange={(event) => setModuleSearch(event.target.value)}
                  />
                  <label className="department-module-selected-filter">
                    <input type="checkbox" checked={showSelectedModules} onChange={(event) => setShowSelectedModules(event.target.checked)} />
                    {settingsTranslations.showSelectedModules}
                  </label>
                  <span>{settingsTranslations.selectedModules}: {selectedModuleCount}/{modules.length}</span>
                </div>
                <div className="role-permission-picker-grid">
                  {filteredPickerGroups.map(({ group, allGroupModules, visibleModules }) => {
                    const selectedCount = allGroupModules.filter((module) => form.moduleIds.includes(module.id)).length;
                    const visibleSelectedCount = visibleModules.filter((module) => form.moduleIds.includes(module.id)).length;
                    const visibleIds = visibleModules.map((module) => module.id);
                    return <section className="role-permission-picker-module" key={group.label}>
                      <div className="permission-picker-module-header">
                        <div className="department-module-group-heading">
                          <h3>{group.label}</h3>
                          <small>{selectedCount}/{allGroupModules.length}</small>
                        </div>
                        <div className="department-module-actions">
                          {!showSelectedModules && <label className="permission-select-all">
                            <input
                              type="checkbox"
                              checked={visibleIds.length > 0 && visibleSelectedCount === visibleIds.length}
                              ref={(input) => { if (input) input.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length }}
                              onChange={() => setForm((current) => ({
                                ...current,
                                moduleIds: visibleSelectedCount === visibleIds.length
                                  ? current.moduleIds.filter((id) => !visibleIds.includes(id))
                                  : [...new Set([...current.moduleIds, ...visibleIds])],
                              }))}
                            />
                            <span>{moduleQuery ? settingsTranslations.selectAllMatchingModules : settingsTranslations.selectAllModuleGroup}</span>
                          </label>}
                        </div>
                      </div>
                      {visibleModules.map((module) => {
                        const ModuleIcon = getModuleIcon(module.iconName || defaultModuleIconNames[module.name]);
                        return <label className="role-permission-option department-module-option" key={module.id}>
                          <input
                            type="checkbox"
                            disabled={saving}
                            checked={form.moduleIds.includes(module.id)}
                            onChange={() => setForm((current) => ({
                              ...current,
                              moduleIds: current.moduleIds.includes(module.id)
                                ? current.moduleIds.filter((id) => id !== module.id)
                                : [...current.moduleIds, module.id],
                            }))}
                          />
                          <ModuleIcon aria-hidden="true" />
                          <span>{moduleLabel(module)}</span>
                        </label>;
                      })}
                    </section>;
                  })}
                  {filteredPickerGroups.length === 0 && <p className="permission-search-empty">{settingsTranslations.noModules}</p>}
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
