import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { Translations } from "../../../../../locales";
import { PaginationFooter } from "../../../../../components/pagination-footer";
import {
  createRole,
  deleteRole,
  listRoles,
  updateRolePermissions,
  type RoleDetails,
  type RoleInput,
  type RolePermission,
} from "../services/roles.service";
import { listPermissions, type Permission } from "../../permissions/services/permissions.service";
import { listPermissionModules, type PermissionModule } from "../../modules/services/modules.service";
import { useErrorToast } from "../../../../../components/toast-provider";
import { useAuth } from "../../../../auth/hooks/use-auth";
import { hasAnyPermission } from "../../../../auth/permissions";

type PermissionModuleKey = string;

function resolvePermissionModule(
  permission: Pick<RolePermission, "module" | "name">,
): PermissionModuleKey {
  return permission.module.trim() || "users";
}

function permissionModuleLabel(
  module: PermissionModuleKey,
  settingsTranslations: Translations["features"]["settingsUser"],
) {
  return settingsTranslations.permissionModules[module as keyof typeof settingsTranslations.permissionModules] ?? module;
}

const emptyRoleForm: RoleInput = {
  name: "",
  description: "",
  isActive: true,
  permissionIds: [],
};

function groupPermissions(permissions: RolePermission[]) {
  const groups = new Map<PermissionModuleKey, RolePermission[]>();

  for (const permission of permissions) {
    const module = resolvePermissionModule(permission);
    const group = groups.get(module) ?? [];
    group.push(permission);
    groups.set(module, group);
  }

  return groups;
}

function permissionActionOrder(name: string) {
  if (name.startsWith("เข้าถึงเมนู") || name.startsWith("ดู")) return 0;
  if (name.startsWith("สร้าง") || name.startsWith("เพิ่ม")) return 1;
  if (name.startsWith("แก้ไข")) return 2;
  if (name.startsWith("ลบ")) return 3;
  if (name.startsWith("กู้คืน")) return 4;
  return 5;
}

function sortPermissions<T extends { name: string }>(permissions: T[]): T[] {
  return [...permissions].sort((left, right) => {
    const actionDifference = permissionActionOrder(left.name) - permissionActionOrder(right.name);
    return actionDifference || left.name.localeCompare(right.name, "th");
  });
}

function PermissionSelectionToggle({
  ids,
  selectedIds,
  label,
  onChange,
}: {
  ids: number[];
  selectedIds: number[];
  label: string;
  onChange: (ids: number[]) => void;
}) {
  const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;

  return (
    <label className="permission-select-all">
      <input
        type="checkbox"
        disabled={ids.length === 0}
        checked={allSelected}
        ref={(input) => {
          if (input) input.indeterminate = selectedCount > 0 && !allSelected;
        }}
        onChange={() => onChange(
          allSelected
            ? selectedIds.filter((id) => !ids.includes(id))
            : [...new Set([...selectedIds, ...ids])],
        )}
      />
      <span>{label}</span>
      <small>{selectedCount}/{ids.length}</small>
    </label>
  );
}

function RoleStatusToggle({
  active,
  translations,
  onChange,
}: {
  active: boolean;
  translations: Translations;
  onChange: (active: boolean) => void;
}) {
  const settingsTranslations = translations.features.settingsUser;
  return (
    <div className="role-status-setting">
      <div>
        <strong>{settingsTranslations.status}</strong>
        <span className={`status-pill ${active ? "is-active" : ""}`}>
          {active ? settingsTranslations.active : settingsTranslations.inactive}
        </span>
      </div>
      <label className="role-status-switch">
        <input
          type="checkbox"
          aria-label={settingsTranslations.status}
          checked={active}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </label>
    </div>
  );
}

export function RolesSection({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser;
  const { user } = useAuth();
  const canCreate = Boolean(user && hasAnyPermission(user, "เพิ่มบทบาท", "จัดการบทบาทและสิทธิ์"));
  const canEdit = Boolean(user && hasAnyPermission(user, "แก้ไขบทบาทและสิทธิ์", "จัดการบทบาทและสิทธิ์"));
  const canDelete = Boolean(user && hasAnyPermission(user, "ลบบทบาท", "จัดการบทบาทและสิทธิ์"));
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [form, setForm] = useState<RoleInput>(emptyRoleForm);
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetails | null>(null);
  const [permissionDialog, setPermissionDialog] = useState<"view" | "edit" | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [selectedRoleActive, setSelectedRoleActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useErrorToast(error);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(roles.length / pageSize), 1);
  const visibleRoles = roles.slice((page - 1) * pageSize, page * pageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rolesResponse = await listRoles();
      setRoles(rolesResponse.data.map((role) => ({
        ...role,
        permissions: sortPermissions(role.permissions),
      })));
      if (canCreate || canEdit) {
        const [permissionsResponse, modulesResponse] = await Promise.all([
          listPermissions(),
          listPermissionModules(),
        ]);
        setPermissions(sortPermissions(permissionsResponse.data));
        setPermissionModules(modulesResponse.data);
      } else {
        setPermissions([]);
        setPermissionModules([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.loadError);
    } finally {
      setLoading(false);
    }
  }, [canCreate, canEdit, settingsTranslations.loadError]);

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
    setSelectedRoleActive(Boolean(role.isActive));
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
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setError("");

    try {
      await updateRolePermissions(
        selectedRole.id,
        selectedPermissionIds,
        selectedRoleActive,
      );
      setPermissionDialog(null);
      setSelectedRole(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(role: RoleDetails) {
    if (role.name.trim().toLowerCase() === "admin") return;
    if (!window.confirm(`${settingsTranslations.deleteRoleConfirm} “${role.name}” ?`)) return;

    setSaving(true);
    setError("");
    try {
      await deleteRole(role.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : settingsTranslations.deleteRoleError);
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

  const displayedPermissionModules = [...new Set(
    [
      ...permissionModules.filter((module) => Boolean(module.isActive)).map((module) => module.name),
      ...roles.flatMap((role) => role.permissions.map((permission) => permission.module)),
    ],
  )];
  const selectedPermissionsByModule = selectedRole
    ? groupPermissions(selectedRole.permissions)
    : null;

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{settingsTranslations.roleManagement}</h1>
          <p>{settingsTranslations.roleHelp}</p>
        </div>
        {canCreate && <button className="primary-button" type="button" onClick={showCreateForm}>
          {settingsTranslations.addRole}
        </button>}
      </header>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{settingsTranslations.role}</th>
              <th>{settingsTranslations.members}</th>
              <th>{settingsTranslations.totalPermissions}</th>
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
            ) : roles.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={5}>
                  {settingsTranslations.noRoles}
                </td>
              </tr>
            ) : (
              visibleRoles.map((role) => (
                <tr key={role.id}>
                  <td data-label={settingsTranslations.role}>
                    <strong>{role.name}</strong>
                  </td>
                  <td data-label={settingsTranslations.members}>{role.userCount}</td>
                  <td data-label={settingsTranslations.totalPermissions}>{role.permissionCount}</td>
                  <td data-label={settingsTranslations.status}>
                    <span
                      className={`status-pill ${role.isActive ? "is-active" : ""}`}
                    >
                      {role.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                    </span>
                  </td>
                  <td data-label={settingsTranslations.actions}>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => showPermissionDialog(role, "view")}
                      >
                        {settingsTranslations.viewPermissions}
                      </button>
                      {canEdit && <button
                        type="button"
                        onClick={() => showPermissionDialog(role, "edit")}
                      >
                        {settingsTranslations.editPermissions}
                      </button>}
                      {canDelete && role.name.trim().toLowerCase() !== "admin" && (
                        <button
                          className="danger-link"
                          type="button"
                          disabled={saving}
                          onClick={() => void removeRole(role)}
                        >
                          {translations.common.actions.delete}
                        </button>
                      )}
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
            className="user-modal role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
          >
            <header>
              <h2 id="role-form-title">{settingsTranslations.newRole}</h2>
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
              <div className="role-form-fields">
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
                <RoleStatusToggle
                  active={form.isActive}
                  translations={translations}
                  onChange={(isActive) => setForm({ ...form, isActive })}
                />
              </div>
              <label>
                {settingsTranslations.description}
                <textarea
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <fieldset className="role-permission-picker">
                <legend>{settingsTranslations.selectPermissions}</legend>
                <PermissionSelectionToggle
                  ids={permissions.filter((permission) => Boolean(permission.isActive)).map((permission) => permission.id)}
                  selectedIds={form.permissionIds}
                  label={settingsTranslations.selectAllPermissions}
                  onChange={(permissionIds) => setForm((current) => ({ ...current, permissionIds }))}
                />
                <div className="role-permission-picker-grid">
                  {displayedPermissionModules.map((module) => {
                    const modulePermissions = permissions.filter(
                      (permission) =>
                        resolvePermissionModule(permission) === module,
                    );

                    return (
                      <section
                        className="role-permission-picker-module"
                        key={module}
                      >
                        <header className="permission-picker-module-header">
                          <h3>{permissionModuleLabel(module, settingsTranslations)}</h3>
                          <PermissionSelectionToggle
                            ids={modulePermissions.filter((permission) => Boolean(permission.isActive)).map((permission) => permission.id)}
                            selectedIds={form.permissionIds}
                            label={settingsTranslations.selectAllModule}
                            onChange={(permissionIds) => setForm((current) => ({ ...current, permissionIds }))}
                          />
                        </header>
                        {modulePermissions.length === 0 ? (
                          <p>{settingsTranslations.noPermissions}</p>
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
                  ? `${settingsTranslations.permissionsFor} ${selectedRole.name}`
                  : `${settingsTranslations.editPermissions}: ${selectedRole.name}`}
              </h2>
              <button
                className="modal-close"
                type="button"
                aria-label={translations.common.actions.cancel}
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
                <div className="role-status-setting">
                  <div>
                    <strong>{settingsTranslations.status}</strong>
                    <span className={`status-pill ${selectedRole.isActive ? "is-active" : ""}`}>
                      {selectedRole.isActive ? settingsTranslations.active : settingsTranslations.inactive}
                    </span>
                  </div>
                </div>
                <fieldset className="role-permission-picker role-permission-view">
                  <legend>{settingsTranslations.selectPermissions}</legend>
                  <div className="role-module-grid">
                    {displayedPermissionModules.map((module) => {
                      const assignedPermissions = (
                        selectedPermissionsByModule?.get(module) ?? []
                      ).filter((permission) => Boolean(permission.isAssigned));

                      return (
                        <section className="role-module" key={module}>
                          <header className="role-module-header">
                            <h3>{permissionModuleLabel(module, settingsTranslations)}</h3>
                            <span>{assignedPermissions.length}</span>
                          </header>
                          {assignedPermissions.length === 0 ? (
                            <p className="role-module-empty">{settingsTranslations.noPermissions}</p>
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
                </fieldset>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void savePermissions();
                }}
              >
                {selectedRole.name.trim().toLowerCase() !== "admin" && (
                  <RoleStatusToggle
                    active={selectedRoleActive}
                    translations={translations}
                    onChange={setSelectedRoleActive}
                  />
                )}
                <fieldset className="role-permission-picker">
                  <legend>{settingsTranslations.selectPermissions}</legend>
                  <PermissionSelectionToggle
                    ids={permissions.filter((permission) => Boolean(permission.isActive)).map((permission) => permission.id)}
                    selectedIds={selectedPermissionIds}
                    label={settingsTranslations.selectAllPermissions}
                    onChange={setSelectedPermissionIds}
                  />
                  <div className="role-permission-picker-grid">
                    {displayedPermissionModules.map((module) => {
                      const modulePermissions = permissions.filter(
                        (permission) =>
                          resolvePermissionModule(permission) === module,
                      );

                      return (
                        <section
                          className="role-permission-picker-module"
                          key={module}
                        >
                          <header className="permission-picker-module-header">
                            <h3>{permissionModuleLabel(module, settingsTranslations)}</h3>
                            <PermissionSelectionToggle
                              ids={modulePermissions.filter((permission) => Boolean(permission.isActive)).map((permission) => permission.id)}
                              selectedIds={selectedPermissionIds}
                              label={settingsTranslations.selectAllModule}
                              onChange={setSelectedPermissionIds}
                            />
                          </header>
                          {modulePermissions.length === 0 ? (
                            <p>{settingsTranslations.noPermissions}</p>
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
            )}
          </section>
        </div>
      )}
    </div>
  );
}
