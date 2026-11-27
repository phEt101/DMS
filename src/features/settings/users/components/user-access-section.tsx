import { useCallback, useEffect, useMemo, useState } from "react";
import type { Translations } from "../../../../locales";
import {
  getUserAccess,
  updateUserAccess,
  type UserAccess,
  type UserAccessModule,
  type UserAccessPermission,
} from "../services/user-access.service";
import { listUsers, type User } from "../services/users.service";
import { listDepartments, type Department } from "../../access/departments/services/departments.service";
import { PaginationFooter } from "../../../../components/pagination-footer";
import { useErrorToast } from "../../../../components/toast-provider";
import { useAuth } from "../../../auth/hooks/use-auth";
import { permissionModuleGroupDefinitions, moduleLabels } from "../../access/modules/module-groups";
import { defaultModuleIconNames, getModuleIcon } from "../../access/modules/module-icons";

// หน้าจอจัดการสิทธิ์รายบุคคล (User Access) — ใช้ได้เฉพาะ role admin เท่านั้น
// แสดงแบบการ์ดกลุ่ม: แต่ละรายการเลือกได้ 1 ใน 3 สถานะด้วยปุ่มเลือก (segmented control)
//   base  = ตามบทบาท + แผนก (ไม่ปรับเอง)
//   grant = เพิ่มสิทธิ์พิเศษ
//   deny  = ถอดสิทธิ์พิเศษ (ห้ามใช้แม้บทบาทจะมี)

type Effect = "base" | "grant" | "deny";

// ข้อความใหม่ของหน้านี้ (ถ้าต้องการย้ายเข้า locale ภายหลัง ให้แทนที่ค่าตรงนี้ได้เลย)
const text = {
  base: "ตามปกติ",
  grant: "เพิ่ม",
  deny: "ถอด",
  legendBase: "ตามบทบาท/แผนก",
  legendGrant: "ให้สิทธิ์พิเศษ",
  legendDeny: "ห้ามใช้ แม้บทบาทจะมี",
  groupGrantAll: "+ เพิ่มทั้งกลุ่ม",
  groupClear: "ล้าง",
  itemsCount: (n: number) => `${n} รายการ`,
  customized: (n: number, total: number) => `ปรับเอง ${n}/${total}`,
  saveBarChanged: (n: number) => `มีการปรับสิทธิ์พิเศษ ${n} รายการ`,
  saveBarNone: "ยังไม่มีสิทธิ์พิเศษ",
};

export function UserAccessSection({ translations }: { translations: Translations }) {
  const c = translations.features.settingsUser;
  const { user: me } = useAuth();
  const isAdmin = me?.role.name.trim().toLowerCase() === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useErrorToast(error);

  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [onlySpecial, setOnlySpecial] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const response = await listUsers({
        search,
        status: statusFilter,
        role: roleFilter,
        departmentId: departmentFilter,
        page,
        limit: pageSize,
      });
      setUsers(response.data);
      setTotal(response.pagination.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, departmentFilter, page, pageSize, c.loadError, isAdmin]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    listDepartments()
      .then((response) => setDepartments(response.data))
      .catch(() => { /* ตัวกรองแผนกใช้รายการจาก users แทน */ });
  }, []);

  const openAccess = useCallback(async (user: User) => {
    setAccessLoading(true);
    setAccess(null);
    setQuery("");
    setOnlySpecial(false);
    setSavedAt(null);
    try {
      const response = await getUserAccess(user.id);
      setAccess(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.loadError);
    } finally {
      setAccessLoading(false);
    }
  }, [c.loadError]);

  const moduleEffect = useCallback((module: UserAccessModule): Effect =>
    module.denied ? "deny" : module.granted ? "grant" : "base", []);
  const permissionEffect = useCallback((permission: UserAccessPermission): Effect =>
    permission.denied ? "deny" : permission.granted ? "grant" : "base", []);

  function patchModule(id: number, effect: Effect) {
    setSavedAt(null);
    setAccess((current) => current ? {
      ...current,
      modules: current.modules.map((module) => module.id === id ? {
        ...module,
        granted: effect === "grant",
        denied: effect === "deny",
      } : module),
    } : current);
  }
  function patchPermission(id: number, effect: Effect) {
    setSavedAt(null);
    setAccess((current) => current ? {
      ...current,
      permissions: current.permissions.map((permission) => permission.id === id ? {
        ...permission,
        granted: effect === "grant",
        denied: effect === "deny",
      } : permission),
    } : current);
  }

  // ตั้งสถานะทั้งกลุ่ม — ครอบคลุมทั้งเมนู (modules) และสิทธิ์ (permissions)
  // ข้ามรายการที่ถูกปิดใช้งาน (isActive = false)
  function setGroupEffect(moduleIds: number[], permissionIds: number[], effect: Effect) {
    setSavedAt(null);
    setAccess((current) => current ? {
      ...current,
      modules: current.modules.map((module) => moduleIds.includes(module.id) && module.isActive ? {
        ...module,
        granted: effect === "grant",
        denied: effect === "deny",
      } : module),
      permissions: current.permissions.map((permission) => permissionIds.includes(permission.id) && permission.isActive ? {
        ...permission,
        granted: effect === "grant",
        denied: effect === "deny",
      } : permission),
    } : current);
  }

  const grantCount = (access?.modules.filter((module) => module.granted).length ?? 0)
    + (access?.permissions.filter((permission) => permission.granted).length ?? 0);
  const denyCount = (access?.modules.filter((module) => module.denied).length ?? 0)
    + (access?.permissions.filter((permission) => permission.denied).length ?? 0);
  const changedCount = grantCount + denyCount;

  const moduleLabel = useCallback((name: string) =>
    c.permissionModules[name as keyof typeof c.permissionModules] ?? moduleLabels[name] ?? name, [c.permissionModules]);

  // จัดกลุ่มแบบหน้าแผนก: กลุ่มตาม module ที่สิทธิ์สังกัด
  const moduleGroups = useMemo(() => {
    if (!access) return [];
    const groups = permissionModuleGroupDefinitions.map((group) => ({
      labelKey: group.labelKey,
      label: c[group.labelKey as keyof typeof c] as string,
      keys: [...group.keys],
      modules: [] as UserAccessModule[],
      permissions: [] as UserAccessPermission[],
    }));
    const known = new Set(groups.flatMap((group) => group.keys));
    const other = { labelKey: null, label: c.otherModules, keys: [] as string[], modules: [] as UserAccessModule[], permissions: [] as UserAccessPermission[] };
    for (const module of access.modules) {
      const target = groups.find((group) => group.keys.includes(module.name)) ?? (known.has(module.name) ? null : other);
      (target ?? other).modules.push(module);
    }
    for (const permission of access.permissions) {
      const target = groups.find((group) => group.keys.includes(permission.module)) ?? (known.has(permission.module) ? null : other);
      (target ?? other).permissions.push(permission);
    }
    return [...groups.filter((group) => group.modules.length > 0 || group.permissions.length > 0), ...(other.modules.length || other.permissions.length ? [other] : [])];
  }, [access, c]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  function matches(value: string, effect: Effect) {
    if (onlySpecial && effect === "base") return false;
    if (!normalizedQuery) return true;
    return value.toLocaleLowerCase().includes(normalizedQuery) || moduleLabel(value).toLocaleLowerCase().includes(normalizedQuery);
  }

  async function save() {
    if (!access) return;
    setSaving(true);
    setError("");
    try {
      await updateUserAccess(access.user.id, {
        moduleGrants: access.modules.filter((module) => module.granted).map((module) => module.id),
        moduleDenies: access.modules.filter((module) => module.denied).map((module) => module.id),
        permissionGrants: access.permissions.filter((permission) => permission.granted).map((permission) => permission.id),
        permissionDenies: access.permissions.filter((permission) => permission.denied).map((permission) => permission.id),
      });
      const response = await getUserAccess(access.user.id);
      setAccess(response.data);
      setSavedAt(Date.now());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.saveError);
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="management-panel">
        <header className="management-header">
          <div><h1>{c.userAccessTitle}</h1><p>{c.userAccessHelp}</p></div>
        </header>
        <div className="users-table-wrap">
          <table className="users-table"><tbody>
            <tr><td className="table-message">{c.userAccessAdminOnly}</td></tr>
          </tbody></table>
        </div>
      </div>
    );
  }

  const departmentOptions = departments.length > 0
    ? departments
    : Array.from(new Map(users.map((user) => [user.department ?? "", user.department ?? ""])).values())
      .filter(Boolean)
      .map((name) => ({ id: 0, companyId: 0, company: "", name, isActive: true, userCount: 0, moduleIds: [] }));

  const toggleLabels = { base: text.base, grant: text.grant, deny: text.deny };

  return (
    <div className="management-panel">
      <header className="management-header">
        <div>
          <h1>{c.userAccessTitle}</h1>
          <p>{c.userAccessHelp}</p>
        </div>
      </header>

      {access ? (
        <div className="user-access-detail">
          <header className="management-header user-access-detail-head">
            <div>
              <button className="secondary-button" type="button" onClick={() => { setAccess(null); void loadUsers(); }}>‹ {c.userAccessBack}</button>
              <h2 className="user-access-user-name">{access.user.name}</h2>
              <p>{access.user.role}{access.user.department ? ` · ${access.user.department}` : ""}{access.user.company ? ` · ${access.user.company}` : ""}</p>
            </div>
          </header>

          <p className="user-access-hint">{c.userAccessHint}</p>

          <div className="ua-legend">
            <span><i className="dot is-base" /> {text.base} = {text.legendBase}</span>
            <span><i className="dot is-grant" /> {text.grant} = {text.legendGrant}</span>
            <span><i className="dot is-deny" /> {text.deny} = {text.legendDeny}</span>
          </div>

          <div className="users-toolbar user-access-toolbar">
            <input
              type="search"
              aria-label={c.userAccessSearchPlaceholder}
              placeholder={c.userAccessSearchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label className="user-access-only-changed">
              <input type="checkbox" checked={onlySpecial} onChange={(event) => setOnlySpecial(event.target.checked)} />
              {c.userAccessOnlyChanged}
            </label>
            <span className="users-count">
              {c.userAccessGrant}: {grantCount} · {c.userAccessDeny}: {denyCount}
            </span>
          </div>

          {accessLoading ? (
            <div className="table-message">{c.loading}</div>
          ) : (
            <div className="user-access-grid">
              {moduleGroups.map((group) => {
                const visibleModules = group.modules.filter((module) => matches(module.name, moduleEffect(module)));
                const visiblePermissions = group.permissions.filter((permission) => matches(permission.name, permissionEffect(permission)));
                if (visibleModules.length === 0 && visiblePermissions.length === 0) return null;

                const moduleIds = visibleModules.map((module) => module.id);
                const permissionIds = visiblePermissions.map((permission) => permission.id);
                const groupTotal = moduleIds.length + permissionIds.length;
                const groupSpecial = visibleModules.filter((module) => module.granted || module.denied).length
                  + visiblePermissions.filter((permission) => permission.granted || permission.denied).length;

                return (
                  <section className="user-access-card" key={group.label}>
                    <header className="user-access-card-head">
                      <div className="ua-card-title">
                        <h3>{group.label}</h3>
                        <small>{groupSpecial > 0 ? text.customized(groupSpecial, groupTotal) : text.itemsCount(groupTotal)}</small>
                      </div>
                      <div className="ua-card-actions">
                        <button type="button" onClick={() => setGroupEffect(moduleIds, permissionIds, "grant")}>
                          {text.groupGrantAll}
                        </button>
                        <button type="button" disabled={groupSpecial === 0} onClick={() => setGroupEffect(moduleIds, permissionIds, "base")}>
                          {text.groupClear}
                        </button>
                      </div>
                    </header>

                    <div className="user-access-card-body">
                      {visibleModules.map((module) => {
                        const Icon = getModuleIcon(defaultModuleIconNames[module.name] ?? null);
                        const effect = moduleEffect(module);
                        return (
                          <div className={`user-access-row is-${effect}`} key={`m-${module.id}`}>
                            <div className="user-access-row-name">
                              <Icon aria-hidden="true" />
                              <div>
                                <span>{moduleLabel(module.name)}</span>
                                <em className={`ua-result ${module.effective ? "is-yes" : "is-no"}`}>
                                  {module.effective ? c.userAccessCanSee : c.userAccessCannotSee}
                                </em>
                              </div>
                            </div>
                            <EffectToggle
                              effect={effect}
                              disabled={!module.isActive}
                              labels={toggleLabels}
                              onChange={(next) => patchModule(module.id, next)}
                            />
                          </div>
                        );
                      })}
                      {visiblePermissions.map((permission) => {
                        const effect = permissionEffect(permission);
                        return (
                          <div className={`user-access-row is-${effect}`} key={`p-${permission.id}`}>
                            <div className="user-access-row-name">
                              <div>
                                <span>{permission.name}</span>
                                <small>{permissionLabel(c, permission.module) ?? permission.module}</small>
                                <em className={`ua-result ${permission.effective ? "is-yes" : "is-no"}`}>
                                  {permission.effective ? c.userAccessCanDo : c.userAccessCannotDo}
                                </em>
                              </div>
                            </div>
                            <EffectToggle
                              effect={effect}
                              disabled={!permission.isActive}
                              labels={toggleLabels}
                              onChange={(next) => patchPermission(permission.id, next)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="ua-savebar">
            <span>
              {changedCount > 0 ? text.saveBarChanged(changedCount) : text.saveBarNone}
              {savedAt && !saving && <b className="user-access-saved" role="status"> · {c.userAccessSaved}</b>}
            </span>
            <button className="primary-button" type="button" disabled={saving} onClick={() => void save()}>
              {saving ? c.saving : translations.common.actions.save}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="users-toolbar users-filter-toolbar">
            <input
              className="users-filter-search"
              aria-label={c.searchPlaceholder}
              placeholder={c.searchPlaceholder}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
              className="users-filter-status"
              aria-label={c.statusFilter}
              value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            >
              <option value="all">{c.allStatuses}</option>
              <option value="active">{c.active}</option>
              <option value="inactive">{c.inactive}</option>
            </select>
            <select
              className="users-filter-role"
              aria-label={c.userRoleFilter}
              value={roleFilter}
              onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}
            >
              <option value="all">{c.allRoles}</option>
              {["admin", "executive", "manager", "user"].map((role) => <option key={role} value={role}>{c.roles[role as keyof typeof c.roles] ?? role}</option>)}
            </select>
            <select
              className="users-filter-department"
              aria-label={c.departmentFilter}
              value={departmentFilter}
              onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }}
            >
              <option value="all">{c.allDepartments}</option>
              {departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <span className="users-count">{total} {c.users}</span>
          </div>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{c.name}</th>
                  <th>{c.company}</th>
                  <th>{c.department}</th>
                  <th>{c.role}</th>
                  <th>{c.status}</th>
                  <th>{c.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="table-message">{c.loading}</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="table-message">{c.empty}</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id}>
                    <td data-label={c.name}><strong>{user.name}</strong><br /><small>{user.email}</small></td>
                    <td data-label={c.company}>{user.company || "—"}</td>
                    <td data-label={c.department}>{user.department || "—"}</td>
                    <td data-label={c.role}><span className="role-badge">{user.role}</span></td>
                    <td data-label={c.status}>
                      <span className={`status-pill ${user.isActive ? "is-active" : ""}`}>{user.isActive ? c.active : c.inactive}</span>
                    </td>
                    <td data-label={c.actions}>
                      <div className="row-actions">
                        <button type="button" onClick={() => void openAccess(user)}>{c.userAccessManage}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            labels={translations.common.pagination}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}

// ปุ่มเลือก 3 ทาง: ตามปกติ / เพิ่ม / ถอด (เลือกได้ทางเดียว)
function EffectToggle({
  effect,
  disabled,
  onChange,
  labels,
}: {
  effect: Effect;
  disabled?: boolean;
  onChange: (effect: Effect) => void;
  labels: { base: string; grant: string; deny: string };
}) {
  const options: { value: Effect; label: string }[] = [
    { value: "base", label: labels.base },
    { value: "grant", label: `+ ${labels.grant}` },
    { value: "deny", label: `− ${labels.deny}` },
  ];
  return (
    <div className="ua-seg" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={effect === option.value}
          disabled={disabled}
          className={`ua-seg-btn is-${option.value}${effect === option.value ? " is-on" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function permissionLabel(c: Translations["features"]["settingsUser"], moduleName: string): string | null {
  const map = c.permissionModules as Record<string, string | undefined>;
  return map?.[moduleName] ?? null;
}