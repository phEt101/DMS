import type { Translations } from '../../locales'

export default function DashboardPage({ translations }: { translations: Translations }) {
  const dashboardTranslations = translations.features.dashboard
  return <section className="feature-page">
    <p className="feature-kicker">{dashboardTranslations.kicker}</p>
    <h1>{dashboardTranslations.title}</h1>
    <span>{dashboardTranslations.subtitle}</span>
  </section>
}
