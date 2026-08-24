import { useCallback, useEffect, useState } from 'react'
import type { UserFeatureCopy } from '../../../../types/localization'
import { getRoleSummary, type RoleSummary, type UserRole } from '../services/usersService'

const roles: UserRole[] = ['admin', 'manager', 'user', 'viewer']
const emptySummary: RoleSummary = { admin: 0, manager: 0, user: 0, viewer: 0 }

export function RolesTab({ t }: { t: UserFeatureCopy }) {
  const [summary, setSummary] = useState<RoleSummary>(emptySummary)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setSummary((await getRoleSummary()).data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.loadError)
    }
  }, [t.loadError])

  useEffect(() => { void load() }, [load])

  return (
    <div className="management-panel">
      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="roles-grid">
        {roles.map((role) => (
          <article className="role-card" key={role}>
            <header>
              <span className={`role-badge role-${role}`}>{t.roles[role]}</span>
              <strong>{summary[role]} {t.users}</strong>
            </header>
            <p>{t.roleDescriptions[role]}</p>
            <ul>
              {t.rolePermissions[role].map((permission) => <li key={permission}>✓ {permission}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
