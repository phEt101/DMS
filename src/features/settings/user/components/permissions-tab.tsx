import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { UserFeatureCopy } from "../../../../types/localization";
import {
  createPermission,
  deletePermission,
  listPermissions,
  updatePermission,
  type Permission,
  type PermissionInput,
} from "../services/accessControlService";
import { PaginationFooter } from "./pagination-footer";

const emptyForm: PermissionInput = {
  name: "",
  module: "",
  description: "",
  isActive: true,
};

export function PermissionsTab({ t }: { t: UserFeatureCopy }) {
  const [items, setItems] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems((await listPermissions()).data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
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
            module: item.module,
            description: item.description ?? "",
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
      setError(caught instanceof Error ? caught.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Permission) {
    if (!window.confirm(`${t.deleteConfirm} “${item.name}” ?`)) return;
    try {
      await deletePermission(item.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h2>{t.permissionManagement}</h2>
          <p>{t.permissionHelp}</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => showForm()}
        >
          {t.addPermission}
        </button>
      </header>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.module}</th>
              <th>{t.assignedRoles}</th>
              <th>{t.status}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {t.loading}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {t.noPermissions}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label={t.name}>
                    <strong>{item.name}</strong>
                    <small className="cell-description">
                      {item.description}
                    </small>
                  </td>
                  <td data-label={t.module}>{item.module}</td>
                  <td data-label={t.assignedRoles}>{item.roleCount}</td>
                  <td data-label={t.status}>
                    <span
                      className={`status-pill ${item.isActive ? "is-active" : ""}`}
                    >
                      {item.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td data-label={t.actions}>
                    <div className="row-actions">
                      <button type="button" onClick={() => showForm(item)}>
                        {t.edit}
                      </button>
                      <button
                        className="danger-link"
                        type="button"
                        onClick={() => void remove(item)}
                      >
                        {t.delete}
                      </button>
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
        labels={t}
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
              <h2 id="permission-form-title">
                {editing ? t.editPermission : t.addPermission}
              </h2>
              <button
                className="modal-close"
                type="button"
                aria-label={t.cancel}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void submit(event)}>
              <div className="form-grid">
                <label>
                  {t.name}
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
                  {t.module}
                  <input
                    required
                    maxLength={80}
                    value={form.module}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        module: event.target.value.toLowerCase(),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                {t.description}
                <textarea
                  maxLength={500}
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
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
                {t.active}
              </label>
              <footer>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  className="primary-button"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? t.saving : t.save}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
