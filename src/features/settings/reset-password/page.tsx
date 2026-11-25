import type { Translations } from '../../../locales'
import { ResetPasswordSetting } from '../access/components/reset-password-setting'

export default function ResetPasswordSettingsPage({ translations }: { translations: Translations }) {
  const settingsTranslations = translations.features.settingsUser

  return (
    <section className="feature-page feature-page--wide users-page">
      <header className="users-header">
        <div>
          <p className="feature-kicker settings-feature-kicker">{settingsTranslations.kicker}</p>
        </div>
      </header>
      <ResetPasswordSetting />
    </section>
  )
}
