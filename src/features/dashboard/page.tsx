import type { FeatureCopy } from '../../types/localization'

export default function DashboardPage({ t }: { t: FeatureCopy }) {
  return <section className="feature-page">
    <p className="feature-kicker">{t.kicker}</p>
    <h1>{t.title}</h1>
    <span>{t.subtitle}</span>
  </section>
}
