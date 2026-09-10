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

const emptyForm: DepartmentInput = {
  name: "",
  isActive: true,
};

export function DepartmentsSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasAnyPermission(user, "เพิ่มแผนก", "จัดการแผนก"));
  const canEdit = Boolean(user && hasAnyPermission(user, "แก้ไขแผนก", "จัดการแผนก"));
  const canDelete = Boolean(user && hasAnyPermission(user, "ลบแผนก", "จัดการแผนก"));
  const [items, setItems] = useState<Department[]>([]);
  const [editing, setEditing] = useState<Department | null>(null);
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
      setItems((await listDepartments()).data);
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

  function showForm(item?: Department) {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
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
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.name}</th>
              <th>{settingsTranslations.members}</th>
              <th>{settingsTranslations.status}</th>
              <th>{settingsTranslations.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-message" colSpan={4}>
                  {settingsTranslations.loading}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={4}>
                  {settingsTranslations.noDepartments}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label={settingsTranslations.name}>
                    <strong>{item.name}</strong>
                  </td>
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
