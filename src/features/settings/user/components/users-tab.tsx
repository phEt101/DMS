import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { UserFeatureCopy } from "../../../../types/localization";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type User,
  type UserInput,
  type UserRole,
} from "../services/usersService";
import {
  listRoles,
  type Role,
} from "../services/accessControlService";
import { PaginationFooter } from "./pagination-footer";

const emptyForm = (): UserInput => ({
  email: "",
  name: "",
  role: "user",
  department: "",
  phone: "",
  isActive: true,
  password: "",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
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

export function UsersTab({ t }: { t: UserFeatureCopy }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      setError(caught instanceof Error ? caught.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void listRoles()
      .then((response) => setRoles(response.data))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t.loadError);
      });
  }, [t.loadError]);
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
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await updateUser(editing.id, payload);
      else await createUser(payload);
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveError);
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
      setError(caught instanceof Error ? caught.message : t.saveError);
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`${t.deleteConfirm} “${user.name}” ?`)) return;
    setError("");
    try {
      await deleteUser(user.id);
      if (users.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.deleteError);
    }
  }

  return (
    <div className="management-panel">
      <div className="users-toolbar">
        <input
          aria-label={t.searchPlaceholder}
          placeholder={t.searchPlaceholder}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          aria-label={t.statusFilter}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t.allStatuses}</option>
          <option value="active">{t.active}</option>
          <option value="inactive">{t.inactive}</option>
        </select>
        <span className="users-count">
          {total} {t.users}
        </span>
        <button className="primary-button" type="button" onClick={openCreate}>
          {t.addUser}
        </button>
      </div>

      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <UsersTable
        users={users}
        loading={loading}
        t={t}
        onEdit={openEdit}
        onRemove={remove}
        onToggleStatus={toggleStatus}
      />

      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={total}
        labels={t}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      {formOpen && (
        <UserFormModal
          editing={editing}
          form={form}
          roles={roles}
          saving={saving}
          t={t}
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
  t,
  onEdit,
  onRemove,
  onToggleStatus,
}: {
  users: User[];
  loading: boolean;
  t: UserFeatureCopy;
  onEdit: (user: User) => void;
  onRemove: (user: User) => Promise<void>;
  onToggleStatus: (user: User) => Promise<void>;
}) {
  return (
    <div className="users-table-wrap">
      <table className="users-table">
        <thead>
          <tr>
            <th>{t.name}</th>
            <th>{t.email}</th>
            <th>{t.department}</th>
            <th>{t.role}</th>
            <th>{t.status}</th>
            <th>{t.lastLogin}</th>
            <th>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="table-message">
                {t.loading}
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={7} className="table-message">
                {t.empty}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-identity">
                    <span className="user-avatar">{initials(user.name)}</span>
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.department || "—"}</td>
                <td>
                  <span className="role-badge">{t.roles[user.role] ?? user.role}</span>
                </td>
                <td>
                  <button
                    className={`status-pill ${user.isActive ? "is-active" : ""}`}
                    type="button"
                    onClick={() => void onToggleStatus(user)}
                  >
                    {user.isActive ? t.active : t.inactive}
                  </button>
                </td>
                <td>
                  {user.lastLoginAt
                    ? dateFormatter.format(new Date(user.lastLoginAt))
                    : t.never}
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onEdit(user)}>
                      {t.edit}
                    </button>
                    <button
                      className="danger-link"
                      type="button"
                      onClick={() => void onRemove(user)}
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
  );
}

function UserFormModal({
  editing,
  form,
  roles,
  saving,
  t,
  onChange,
  onClose,
  onSubmit,
}: {
  editing: User | null;
  form: UserInput;
  roles: Role[];
  saving: boolean;
  t: UserFeatureCopy;
  onChange: (form: UserInput) => void;
  onClose: () => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}) {
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
            <p className="feature-kicker">{editing ? t.edit : t.addUser}</p>
            <h2 id="user-form-title">{editing ? editing.name : t.newUser}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
          >
            ×
          </button>
        </header>
        <form onSubmit={(event) => void onSubmit(event)}>
          <label>
            {t.name}
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
            {t.email}
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
            {t.password}
            <input
              required={!editing}
              minLength={8}
              type="password"
              autoComplete="new-password"
              placeholder={editing ? t.passwordOptional : ""}
              value={form.password}
              onChange={(event) =>
                onChange({ ...form, password: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              {t.department}
              <input
                maxLength={100}
                value={form.department}
                onChange={(event) =>
                  onChange({ ...form, department: event.target.value })
                }
              />
            </label>
            <label>
              {t.phone}
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
            {t.role}
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
                  {t.roles[role.name] ?? role.name}
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
            {t.activeUser}
          </label>
          <footer>
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              {t.cancel}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? t.saving : t.save}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
