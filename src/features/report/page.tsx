import type { Translations } from '../../locales'

export default function ReportPage({ translations }: { translations: Translations }) {
  const reportTranslations = translations.features.report
  return <section className="feature-page">
    <p className="feature-kicker">{reportTranslations.kicker}</p>
    <h1>{reportTranslations.title}</h1>
    <span>{reportTranslations.subtitle}</span>
  </section>
}
