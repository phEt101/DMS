import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { UserFeatureCopy } from "../../../../types/localization";
import { PaginationFooter } from "./pagination-footer";
import {
  createRole,
  listPermissions,
  listRoles,
  updateRolePermissions,
  type Permission,
  type RoleDetails,
  type RoleInput,
  type RolePermission,
} from "../services/accessControlService";

type PermissionModule = keyof UserFeatureCopy["permissionModules"];

const permissionModuleOrder: PermissionModule[] = [
  "dashboard",
  "documents",
  "reports",
  "trash",
  "users",
  "activity_logs",
];

function resolvePermissionModule(
  permission: Pick<RolePermission, "module" | "name">,
): PermissionModule {
  if (permission.module === "roles" || permission.module === "departments") {
    return "users";
  }

  return permissionModuleOrder.includes(permission.module as PermissionModule)
    ? (permission.module as PermissionModule)
    : "users";
}

const emptyRoleForm: RoleInput = {
  name: "",
  description: "",
  isActive: true,
  permissionIds: [],
};

function groupPermissions(permissions: RolePermission[]) {
  const groups = new Map<PermissionModule, RolePermission[]>();

  for (const permission of permissions) {
    const module = resolvePermissionModule(permission);
    const group = groups.get(module) ?? [];
    group.push(permission);
    groups.set(module, group);
  }

  return groups;
}

export function RolesTab({ t }: { t: UserFeatureCopy }) {
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<RoleInput>(emptyRoleForm);
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetails | null>(null);
  const [permissionDialog, setPermissionDialog] = useState<"view" | "edit" | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(roles.length / pageSize), 1);
  const visibleRoles = roles.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        listRoles(),
        listPermissions(),
      ]);
      setRoles(rolesResponse.data);
      setPermissions(permissionsResponse.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  function showCreateForm() {
    setForm({ ...emptyRoleForm, permissionIds: [] });
    setOpen(true);
    setError("");
  }

  function togglePermission(permissionId: number) {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  }

  function showPermissionDialog(role: RoleDetails, mode: "view" | "edit") {
    setSelectedRole(role);
    setSelectedPermissionIds(
      role.permissions
        .filter((permission) => Boolean(permission.isAssigned))
        .map((permission) => permission.id),
    );
    setPermissionDialog(mode);
    setError("");
  }

  function toggleSelectedPermission(permissionId: number) {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createRole(form);
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setError("");

    try {
      await updateRolePermissions(selectedRole.id, selectedPermissionIds);
      setPermissionDialog(null);
      setSelectedRole(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedPermissionsByModule = selectedRole
    ? groupPermissions(selectedRole.permissions)
    : null;

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h2>{t.roleManagement}</h2>
          <p>{t.roleHelp}</p>
        </div>
        <button className="primary-button" type="button" onClick={showCreateForm}>
          {t.addRole}
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
              <th>{t.role}</th>
              <th>{t.members}</th>
              <th>{t.totalPermissions}</th>
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
            ) : roles.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {t.noRoles}
                </td>
              </tr>
            ) : (
              visibleRoles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <strong>{role.name}</strong>
                  </td>
                  <td>{role.userCount}</td>
                  <td>{role.permissionCount}</td>
                  <td>
                    <span
                      className={`status-pill ${role.isActive ? "is-active" : ""}`}
                    >
                      {role.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => showPermissionDialog(role, "view")}
                      >
                        {t.viewPermissions}
                      </button>
                      <button
                        type="button"
                        onClick={() => showPermissionDialog(role, "edit")}
                      >
                        {t.editPermissions}
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
        total={roles.length}
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
            className="user-modal role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
          >
            <header>
              <h2 id="role-form-title">{t.newRole}</h2>
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
              {error && (
                <div className="form-alert" role="alert">
                  {error}
                </div>
              )}
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
                <label className="checkbox-field role-active-field">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({ ...form, isActive: event.target.checked })
                    }
                  />
                  {t.active}
                </label>
              </div>
              <label>
                {t.description}
                <textarea
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <fieldset className="role-permission-picker">
                <legend>{t.selectPermissions}</legend>
                <div className="role-permission-picker-grid">
                  {permissionModuleOrder.map((module) => {
                    const modulePermissions = permissions.filter(
                      (permission) =>
                        resolvePermissionModule(permission) === module,
                    );

                    return (
                      <section
                        className="role-permission-picker-module"
                        key={module}
                      >
                        <h3>{t.permissionModules[module]}</h3>
                        {modulePermissions.length === 0 ? (
                          <p>{t.noPermissions}</p>
                        ) : (
                          modulePermissions.map((permission) => (
                            <label
                              className="role-permission-option"
                              key={permission.id}
                            >
                              <input
                                type="checkbox"
                                disabled={!Boolean(permission.isActive)}
                                checked={form.permissionIds.includes(permission.id)}
                                onChange={() => togglePermission(permission.id)}
                              />
                              <span>{permission.name}</span>
                            </label>
                          ))
                        )}
                      </section>
                    );
                  })}
                </div>
              </fieldset>
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
      {selectedRole && permissionDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPermissionDialog(null);
              setSelectedRole(null);
            }
          }}
        >
          <section
            className="user-modal role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-permission-dialog-title"
          >
            <header>
              <h2 id="role-permission-dialog-title">
                {permissionDialog === "view"
                  ? `${t.permissionsFor} ${selectedRole.name}`
                  : `${t.editPermissions}: ${selectedRole.name}`}
              </h2>
              <button
                className="modal-close"
                type="button"
                aria-label={t.cancel}
                onClick={() => {
                  setPermissionDialog(null);
                  setSelectedRole(null);
                }}
              >
                ×
              </button>
            </header>

            {permissionDialog === "view" ? (
              <div className="role-permission-dialog-content">
                <div className="role-module-grid">
                  {permissionModuleOrder.map((module) => {
                    const assignedPermissions = (
                      selectedPermissionsByModule?.get(module) ?? []
                    ).filter((permission) => Boolean(permission.isAssigned));

                    return (
                      <section className="role-module" key={module}>
                        <header className="role-module-header">
                          <h3>{t.permissionModules[module]}</h3>
                          <span>{assignedPermissions.length}</span>
                        </header>
                        {assignedPermissions.length === 0 ? (
                          <p className="role-module-empty">{t.noPermissions}</p>
                        ) : (
                          <ul className="role-permissions-list">
                            {assignedPermissions.map((permission) => (
                              <li className="is-enabled" key={permission.id}>
                                <span
                                  className="role-permission-indicator"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                                <span className="role-permission-name">
                                  {permission.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void savePermissions();
                }}
              >
                {error && (
                  <div className="form-alert" role="alert">
                    {error}
                  </div>
                )}
                <fieldset className="role-permission-picker">
                  <legend>{t.selectPermissions}</legend>
                  <div className="role-permission-picker-grid">
                    {permissionModuleOrder.map((module) => {
                      const modulePermissions = permissions.filter(
                        (permission) =>
                          resolvePermissionModule(permission) === module,
                      );

                      return (
                        <section
                          className="role-permission-picker-module"
                          key={module}
                        >
                          <h3>{t.permissionModules[module]}</h3>
                          {modulePermissions.length === 0 ? (
                            <p>{t.noPermissions}</p>
                          ) : (
                            modulePermissions.map((permission) => (
                              <label
                                className="role-permission-option"
                                key={permission.id}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!Boolean(permission.isActive)}
                                  checked={selectedPermissionIds.includes(
                                    permission.id,
                                  )}
                                  onChange={() =>
                                    toggleSelectedPermission(permission.id)
                                  }
                                />
                                <span>{permission.name}</span>
                              </label>
                            ))
                          )}
                        </section>
                      );
                    })}
                  </div>
                </fieldset>
                <footer>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setPermissionDialog(null)}
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
            )}
          </section>
        </div>
      )}
    </div>
  );
}
