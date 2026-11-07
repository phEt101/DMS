import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../../locales";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasPermission } from "../../../../auth/permissions";
import {
  createPermissionModule,
  deletePermissionModule,
  listPermissionModules,
  updatePermissionModule,
  type PermissionModule,
  type PermissionModuleInput,
} from "../services/modules.service";
import { getModuleIcon, moduleIconComponents, moduleIconOptions } from "../module-icons";

const emptyForm: PermissionModuleInput = {
  name: "",
  iconName: "FaLayerGroup",
  sortOrder: 0,
  isActive: true,
};

export function ModulesSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasPermission(user, "เพิ่มโมดูล"));
  const canEdit = Boolean(user && hasPermission(user, "แก้ไขโมดูล"));
  const canDelete = Boolean(user && hasPermission(user, "ลบโมดูล"));
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [editing, setEditing] = useState<PermissionModule | null>(null);
  const [form, setForm] = useState<PermissionModuleInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  useErrorToast(error);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredModules = modules.filter((module) => {
    const displayName = settingsTranslations.permissionModules[module.name as keyof typeof settingsTranslations.permissionModules] ?? module.name;
    const matchesSearch = !normalizedSearch || module.name.toLocaleLowerCase().includes(normalizedSearch) || displayName.toLocaleLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || Boolean(module.isActive) === (statusFilter === "active");
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(Math.ceil(filteredModules.length / pageSize), 1);
  const visibleModules = filteredModules.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setModules((await listPermissionModules()).data);
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
  }, [search, statusFilter]);

  function showForm(module?: PermissionModule) {
    setEditing(module ?? null);
    setForm(
      module
        ? {
            name: module.name,
            iconName: module.iconName || "FaLayerGroup",
            sortOrder: module.sortOrder,
            isActive: Boolean(module.isActive),
          }
        : emptyForm,
    );
    setError("");
    setOpen(true);
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await updatePermissionModule(editing.id, form);
      else await createPermissionModule(form);
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(module: PermissionModule) {
    if (!window.confirm(`${settingsTranslations.deleteConfirm} “${module.name}” ?`)) return;
    try {
      await deletePermissionModule(module.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.moduleManagement}</h1>
          <p>{settingsTranslations.moduleHelp}</p>
        </div>
        {canCreate && <button
          className="primary-button"
          type="button"
          onClick={() => showForm()}
        >
          {settingsTranslations.addModule}
        </button>}
      </header>
      <div className="users-toolbar">
        <input
          type="search"
          aria-label={settingsTranslations.moduleSearchPlaceholder}
          placeholder={settingsTranslations.moduleSearchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label={settingsTranslations.statusFilter} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{settingsTranslations.allStatuses}</option>
          <option value="active">{settingsTranslations.active}</option>
          <option value="inactive">{settingsTranslations.inactive}</option>
        </select>
        <span className="users-count">{filteredModules.length} {settingsTranslations.module}</span>
      </div>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.name}</th>
              <th>{settingsTranslations.sortOrder}</th>
              <th>{settingsTranslations.permissionsCount}</th>
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
            ) : filteredModules.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.noModules}
                </td>
              </tr>
            ) : (
              visibleModules.map((module) => {
                const ModuleIcon = getModuleIcon(module.iconName);
                return <tr key={module.id}>
                  <td data-label={settingsTranslations.name}>
                    <ModuleIcon className="module-list-icon" aria-hidden="true" />
                    <strong>{settingsTranslations.permissionModules[module.name as keyof typeof settingsTranslations.permissionModules] ?? module.name}</strong>
                  </td>
                  <td data-label={settingsTranslations.sortOrder}>{module.sortOrder}</td>
                  <td data-label={settingsTranslations.permissionsCount}>
                    {module.permissionCount}
                  </td>
                  <td data-label={settingsTranslations.status}>
                    <span
                      className={`status-pill ${module.isActive ? "is-active" : ""}`}
                    >
                      {module.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                    </span>
                  </td>
                  <td data-label={settingsTranslations.actions}>
                    <div className="row-actions">
                      {canEdit && <button type="button" onClick={() => showForm(module)}>
                        {translations.common.actions.edit}
                      </button>}
                      {canDelete && <button
                        className="danger-link"
                        type="button"
                        disabled={module.permissionCount > 0}
                        onClick={() => void remove(module)}
                      >
                        {translations.common.actions.delete}
                      </button>}
                    </div>
                  </td>
                </tr>
              })
            )}
          </tbody>
        </table>
      </div>
      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={filteredModules.length}
        labels={translations.common.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true">
            <header>
              <h2>{editing ? settingsTranslations.editModule : settingsTranslations.addModule}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void submit(event)}>
              <div className="form-grid">
                <label>
                  {settingsTranslations.name}
                  <input
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value.toLowerCase(),
                      })
                    }
                  />
                </label>
                <label>
                  {settingsTranslations.sortOrder}
                  <input
                    required
                    min={0}
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <fieldset className="module-icon-picker">
                <legend>{settingsTranslations.iconName}</legend>
                <div className="module-icon-picker-grid">
                  {form.iconName && !moduleIconComponents[form.iconName] && (
                    <label className="module-icon-option is-selected">
                      <input type="radio" name="module-icon" value={form.iconName} checked readOnly />
                      {(() => {
                        const ModuleIcon = getModuleIcon(form.iconName);
                        return <ModuleIcon aria-hidden="true" />;
                      })()}
                      <span>{form.iconName}</span>
                    </label>
                  )}
                  {moduleIconOptions.map(({ name, Icon }) => (
                    <label className={`module-icon-option${form.iconName === name ? " is-selected" : ""}`} key={name}>
                      <input
                        type="radio"
                        name="module-icon"
                        value={name}
                        checked={form.iconName === name}
                        onChange={() => setForm({ ...form, iconName: name })}
                      />
                      <Icon aria-hidden="true" />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
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
