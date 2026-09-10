import type { Translations } from '../../../locales'
import { UsersSection } from './components/users-section'

export default function SettingsUsersPage({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser
  return (
    <section className="feature-page feature-page--wide users-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{settingsTranslations.kicker}</p>
          <h1>{settingsTranslations.title}</h1>
          <p className="users-header-description">{settingsTranslations.subtitle}</p>
        </div>
      </header>

      <UsersSection translations={translations} />
    </section>
  )
}
