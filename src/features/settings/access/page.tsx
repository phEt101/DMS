import type { UserFeatureCopy } from '../../../types/localization'
import { DepartmentsSection } from './departments/components/departments-section'
import { ModulesSection } from './modules/components/modules-section'
import { PermissionsSection } from './permissions/components/permissions-section'
import { RolesSection } from './roles/components/roles-section'

export type AccessSection = 'roles' | 'departments' | 'permissions' | 'modules'

export default function SettingsAccessPage({ t, section }: { t: UserFeatureCopy; section: AccessSection }) {
  return (
    <section className="feature-page feature-page--wide users-page access-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{t.kicker}</p>
        </div>
      </header>

      {section === 'roles' && <RolesSection t={t} />}
      {section === 'departments' && <DepartmentsSection t={t} />}
      {section === 'permissions' && <PermissionsSection t={t} />}
      {section === 'modules' && <ModulesSection t={t} />}
    </section>
  )
}
