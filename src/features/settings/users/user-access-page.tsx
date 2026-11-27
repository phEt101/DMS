import type { Translations } from '../../../locales'
import { UserAccessSection } from './components/user-access-section'

export default function SettingsUserAccessPage({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser
  return (
    <section className="feature-page feature-page--wide users-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{settingsTranslations.kicker}</p>
        </div>
      </header>

      <UserAccessSection translations={translations} />
    </section>
  )
}
