import { useCallback, useEffect, useState } from "react";
import type { UserFeatureCopy } from "../../../../types/localization";
import { listRoles, type RoleDetails } from "../services/accessControlService";

export function RolesTab({ t }: { t: UserFeatureCopy }) {
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const rolesResponse = await listRoles();
      setRoles(rolesResponse.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.loadError);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="management-panel">
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <div className="roles-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.id}>
            <header>
              <span className="role-badge">{role.name}</span>
              <strong>
                {role.userCount} {t.users}
              </strong>
            </header>
            <div className="role-permissions">
              <ul className="role-permissions-list">
                {role.permissions.map((permission) => {
                  const enabled = Boolean(
                    permission.isAssigned && permission.isActive,
                  );

                  return (
                    <li
                      className={enabled ? "is-enabled" : "is-disabled"}
                      key={permission.id}
                    >
                      <span className="role-permission-indicator" aria-hidden="true">
                        {enabled ? "✓" : "−"}
                      </span>
                      <span className="role-permission-name">{permission.name}</span>
                      <span className="role-permission-status">
                        {enabled ? t.active : t.inactive}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <ul className="role-card-summary">
              <li className="role-card-summary-item">
                <strong>{t.totalPermissions}:</strong> {role.permissionCount}
              </li>
              <li className="role-card-summary-item">
                {t.status}: {role.isActive ? t.active : t.inactive}
              </li>
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
