import type { Translations } from '../../../locales'
import { DepartmentsSection } from './departments/components/departments-section'
import { ModulesSection } from './modules/components/modules-section'
import { PermissionsSection } from './permissions/components/permissions-section'
import { RolesSection } from './roles/components/roles-section'

export type AccessSection = 'roles' | 'departments' | 'permissions' | 'modules'

export default function SettingsAccessPage({ translations, section }: { translations: Translations; section: AccessSection }) {
  const settingsTranslations = translations.features.settingsUser
  return (
    <section className="feature-page feature-page--wide users-page access-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{settingsTranslations.kicker}</p>
        </div>
      </header>

      {section === 'roles' && <RolesSection translations={translations} />}
      {section === 'departments' && <DepartmentsSection translations={translations} />}
      {section === 'permissions' && <PermissionsSection translations={translations} />}
      {section === 'modules' && <ModulesSection translations={translations} />}
    </section>
  )
}
