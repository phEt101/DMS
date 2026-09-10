import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../locales";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type User,
  type UserInput,
  type UserRole,
} from "../services/users.service";
import {
  listDepartments,
  type Department,
} from "../../access/departments/services/departments.service";
import { listRoles, type Role } from "../../access/roles/services/roles.service";
import { PaginationFooter } from "../../../../components/pagination-footer";
import { useErrorToast } from "../../../../components/toast-provider";
import { useAuth } from "../../../auth/hooks/use-auth";
import { hasPermission } from "../../../auth/permissions";

const emptyForm = (): UserInput => ({
  email: "",
  name: "",
  role: "user",
  department: "",
  phone: "",
  isActive: true,
  password: "",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UsersSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user: authenticatedUser } = useAuth();
  const canCreate = Boolean(authenticatedUser && hasPermission(authenticatedUser, "สร้างผู้ใช้งาน"));
  const canEdit = Boolean(authenticatedUser && hasPermission(authenticatedUser, "แก้ไขผู้ใช้งาน"));
  const canDelete = Boolean(authenticatedUser && hasPermission(authenticatedUser, "ลบผู้ใช้งาน"));
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useErrorToast(error);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const usersResponse = await listUsers({ search, status, page, limit: pageSize });
      setUsers(usersResponse.data);
      setTotal(usersResponse.pagination.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, settingsTranslations.loadError]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!canCreate && !canEdit) return;
    void Promise.all([listRoles(), listDepartments()])
      .then(([rolesResponse, departmentsResponse]) => {
        setRoles(rolesResponse.data);
        setDepartments(departmentsResponse.data);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
      });
  }, [canCreate, canEdit, settingsTranslations.loadError]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    const defaultRole = roles.find((role) => Boolean(role.isActive))?.name ?? "";
    setForm({ ...emptyForm(), role: defaultRole });
    setError("");
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department ?? "",
      phone: user.phone ?? "",
      isActive: Boolean(user.isActive),
      password: "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const payload: Partial<UserInput> = { ...form };
        if (!payload.password) delete payload.password;
        if (payload.role === editing.role) delete payload.role;
        if (payload.department === (editing.department ?? "")) {
          delete payload.department;
        }
        await updateUser(editing.id, payload);
      } else {
        await createUser(form);
      }
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: User) {
    setError("");
    try {
      await updateUser(user.id, { isActive: !Boolean(user.isActive) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`${settingsTranslations.deleteConfirm} “${user.name}” ?`)) return;
    setError("");
    try {
      await deleteUser(user.id);
      if (users.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <div className="users-toolbar">
        <input
          aria-label={settingsTranslations.searchPlaceholder}
          placeholder={settingsTranslations.searchPlaceholder}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          aria-label={settingsTranslations.statusFilter}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">{settingsTranslations.allStatuses}</option>
          <option value="active">{settingsTranslations.active}</option>
          <option value="inactive">{settingsTranslations.inactive}</option>
        </select>
        <span className="users-count">
          {total} {settingsTranslations.users}
        </span>
        {canCreate && <button className="primary-button" type="button" onClick={openCreate}>
          {settingsTranslations.addUser}
        </button>}
      </div>

      <UsersTable
        users={users}
        loading={loading}
        translations={translations}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={openEdit}
        onRemove={remove}
        onToggleStatus={toggleStatus}
      />

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={total}
        labels={translations.common.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      {formOpen && (
        <UserFormModal
          editing={editing}
          form={form}
          roles={roles}
          departments={departments}
          saving={saving}
          translations={translations}
          onChange={setForm}
          onClose={() => setFormOpen(false)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function UsersTable({
  users,
  loading,
  translations,
  onEdit,
  onRemove,
  onToggleStatus,
  canEdit,
  canDelete,
}: {
  users: User[];
  loading: boolean;
  translations: Translations;
  onEdit: (user: User) => void;
  onRemove: (user: User) => Promise<void>;
  onToggleStatus: (user: User) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const settingsTranslations = translations.features.settingsUser;
  return (
    <div className="users-table-wrap">
      <table className="users-table">
        <thead>
          <tr>
            <th>{settingsTranslations.name}</th>
            <th>{settingsTranslations.email}</th>
            <th>{settingsTranslations.department}</th>
            <th>{settingsTranslations.role}</th>
            <th>{settingsTranslations.status}</th>
            <th>{settingsTranslations.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="table-message">
                {settingsTranslations.loading}
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="table-message">
                {settingsTranslations.empty}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td data-label={settingsTranslations.name}>
                  <div className="user-identity">
                    <span className="user-avatar">{initials(user.name)}</span>
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td data-label={settingsTranslations.email}>{user.email}</td>
                <td data-label={settingsTranslations.department}>{user.department || "—"}</td>
                <td data-label={settingsTranslations.role}>
                  <span className="role-badge">{user.role}</span>
                </td>
                <td data-label={settingsTranslations.status}>
                  {canEdit ? <button
                    className={`status-pill ${user.isActive ? "is-active" : ""}`}
                    type="button"
                    onClick={() => void onToggleStatus(user)}
                  >
                    {user.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                  </button> : <span className={`status-pill ${user.isActive ? "is-active" : ""}`}>
                    {user.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                  </span>}
                </td>
                <td data-label={settingsTranslations.actions}>
                  <div className="row-actions">
                    {canEdit && <button type="button" onClick={() => onEdit(user)}>
                      {translations.common.actions.edit}
                    </button>}
                    {canDelete && <button
                      className="danger-link"
                      type="button"
                      onClick={() => void onRemove(user)}
                    >
                      {translations.common.actions.delete}
                    </button>}
                    {!canEdit && !canDelete && <span>—</span>}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function UserFormModal({
  editing,
  form,
  roles,
  departments,
  saving,
  translations,
  onChange,
  onClose,
  onSubmit,
}: {
  editing: User | null;
  form: UserInput;
  roles: Role[];
  departments: Department[];
  saving: boolean;
  translations: Translations;
  onChange: (form: UserInput) => void;
  onClose: () => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}) {
  const settingsTranslations = translations.features.settingsUser;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <header>
          <div>
            <p className="feature-kicker">{editing ? translations.common.actions.edit : settingsTranslations.addUser}</p>
            <h2 id="user-form-title">{editing ? editing.name : settingsTranslations.newUser}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label={translations.common.actions.cancel}
          >
            ×
          </button>
        </header>
        <form onSubmit={(event) => void onSubmit(event)}>
          <label>
            {settingsTranslations.name}
            <input
              required
              maxLength={150}
              value={form.name}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            {settingsTranslations.email}
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                onChange({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            {settingsTranslations.password}
            <input
              required={!editing}
              minLength={8}
              type="password"
              autoComplete="new-password"
              placeholder={editing ? settingsTranslations.passwordOptional : ""}
              value={form.password}
              onChange={(event) =>
                onChange({ ...form, password: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              {settingsTranslations.department}
              <select
                value={form.department}
                onChange={(event) =>
                  onChange({ ...form, department: event.target.value })
                }
              >
                <option value="">—</option>
                {departments
                  .filter(
                    (department) =>
                      Boolean(department.isActive) ||
                      department.name === form.department,
                  )
                  .map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {settingsTranslations.phone}
              <input
                maxLength={30}
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  onChange({ ...form, phone: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            {settingsTranslations.role}
            <select
              required
              value={form.role}
              onChange={(event) =>
                onChange({ ...form, role: event.target.value as UserRole })
              }
            >
              {roles
                .filter((role) => Boolean(role.isActive) || role.name === form.role)
                .map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.checked })
              }
            />
            {settingsTranslations.activeUser}
          </label>
          <footer>
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              {translations.common.actions.cancel}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? settingsTranslations.saving : translations.common.actions.save}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
