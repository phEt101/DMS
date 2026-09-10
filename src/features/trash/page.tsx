import type { Translations } from '../../locales'

export default function TrashPage({ translations }: { translations: Translations }) {
  const trashTranslations = translations.features.trash
  return <section className="feature-page">
    <p className="feature-kicker">{trashTranslations.kicker}</p>
    <h1>{trashTranslations.title}</h1>
    <span>{trashTranslations.subtitle}</span>
  </section>
}
