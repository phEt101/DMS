import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../../locales";
import {
  createPermission,
  deletePermission,
  listPermissions,
  updatePermission,
  type Permission,
  type PermissionInput,
} from "../services/permissions.service";
import { listPermissionModules, type PermissionModule } from "../../modules/services/modules.service";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasPermission } from "../../../../auth/permissions";

const emptyForm: PermissionInput = {
  name: "",
  moduleId: 0,
  isActive: true,
};

export function PermissionsSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasPermission(user, "เพิ่มสิทธิ์"));
  const canEdit = Boolean(user && hasPermission(user, "แก้ไขสิทธิ์"));
  const canDelete = Boolean(user && hasPermission(user, "ลบสิทธิ์"));
  const [items, setItems] = useState<Permission[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useErrorToast(error);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const permissionsResponse = await listPermissions();
      setItems(permissionsResponse.data);
      if (canCreate || canEdit) {
        setModules((await listPermissionModules()).data);
      } else {
        setModules([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
    } finally {
      setLoading(false);
    }
  }, [canCreate, canEdit, settingsTranslations.loadError]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function showForm(item?: Permission) {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
            moduleId: item.moduleId,
            isActive: Boolean(item.isActive),
          }
        : emptyForm,
    );
    setOpen(true);
    setError("");
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await updatePermission(editing.id, form);
      else await createPermission(form);
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Permission) {
    if (!window.confirm(`${settingsTranslations.deleteConfirm} “${item.name}” ?`)) return;
    try {
      await deletePermission(item.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.permissionManagement}</h1>
          <p>{settingsTranslations.permissionHelp}</p>
        </div>
        {canCreate && <button
          className="primary-button"
          type="button"
          onClick={() => showForm()}
        >
          {settingsTranslations.addPermission}
        </button>}
      </header>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.name}</th>
              <th>{settingsTranslations.module}</th>
              <th>{settingsTranslations.assignedRoles}</th>
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
            ) : items.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.noPermissions}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label={settingsTranslations.name}>
                    <strong>{item.name}</strong>
                  </td>
                  <td data-label={settingsTranslations.module}>{item.module}</td>
                  <td data-label={settingsTranslations.assignedRoles}>{item.roleCount}</td>
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
        total={items.length}
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
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-form-title"
          >
            <header>
              <h1 id="permission-form-title">
                {editing ? settingsTranslations.editPermission : settingsTranslations.addPermission}
              </h1>
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
              <div className="form-grid">
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
                <label>
                  {settingsTranslations.module}
                  <select
                    required
                    value={form.moduleId || ""}
                    onChange={(event) =>
                      setForm({ ...form, moduleId: Number(event.target.value) })
                    }
                  >
                    <option value="" disabled>—</option>
                    {modules
                      .filter((module) => Boolean(module.isActive) || module.id === form.moduleId)
                      .map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
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
