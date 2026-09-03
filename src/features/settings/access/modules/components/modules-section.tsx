import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { UserFeatureCopy } from "../../../../../types/localization";
import { PaginationFooter } from "../../../components/pagination-footer";
import {
  createPermissionModule,
  deletePermissionModule,
  listPermissionModules,
  updatePermissionModule,
  type PermissionModule,
  type PermissionModuleInput,
} from "../services/modules.service";

const emptyForm: PermissionModuleInput = {
  name: "",
  sortOrder: 0,
  isActive: true,
};

export function ModulesSection({ t }: { t: UserFeatureCopy }) {
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [editing, setEditing] = useState<PermissionModule | null>(null);
  const [form, setForm] = useState<PermissionModuleInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(modules.length / pageSize), 1);
  const visibleModules = modules.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setModules((await listPermissionModules()).data);
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

  function showForm(module?: PermissionModule) {
    setEditing(module ?? null);
    setForm(
      module
        ? {
            name: module.name,
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
      setError(caught instanceof Error ? caught.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(module: PermissionModule) {
    if (!window.confirm(`${t.deleteConfirm} “${module.name}” ?`)) return;
    try {
      await deletePermissionModule(module.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{t.moduleManagement}</h1>
          <p>{t.moduleHelp}</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => showForm()}
        >
          {t.addModule}
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
              <th>{t.sortOrder}</th>
              <th>{t.permissionsCount}</th>
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
            ) : modules.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {t.noModules}
                </td>
              </tr>
            ) : (
              visibleModules.map((module) => (
                <tr key={module.id}>
                  <td data-label={t.name}>
                    <strong>{module.name}</strong>
                  </td>
                  <td data-label={t.sortOrder}>{module.sortOrder}</td>
                  <td data-label={t.permissionsCount}>
                    {module.permissionCount}
                  </td>
                  <td data-label={t.status}>
                    <span
                      className={`status-pill ${module.isActive ? "is-active" : ""}`}
                    >
                      {module.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td data-label={t.actions}>
                    <div className="row-actions">
                      <button type="button" onClick={() => showForm(module)}>
                        {t.edit}
                      </button>
                      <button
                        className="danger-link"
                        type="button"
                        disabled={module.permissionCount > 0}
                        onClick={() => void remove(module)}
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
        total={modules.length}
        labels={t}
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
              <h2>{editing ? t.editModule : t.addModule}</h2>
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
                  {t.name}
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
                  {t.sortOrder}
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
