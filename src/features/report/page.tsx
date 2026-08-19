export default function ReportPage({ t }) {
  return <section className="feature-page">
    <p className="feature-kicker">{t.kicker}</p>
    <h1>{t.title}</h1>
    <span>{t.subtitle}</span>
  </section>
}
