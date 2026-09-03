import type { UserFeatureCopy } from '../../../types/localization'
import { UsersSection } from './components/users-section'

export default function SettingsUsersPage({ t }: { t: UserFeatureCopy }) {
  return (
    <section className="feature-page feature-page--wide users-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{t.kicker}</p>
          <h1>{t.title}</h1>
          <p className="users-header-description">{t.subtitle}</p>
        </div>
      </header>

      <UsersSection t={t} />
    </section>
  )
}
