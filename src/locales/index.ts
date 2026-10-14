import th from './th/common.json'
import en from './en/common.json'
import thSurvey from './th/survey.json'
import enSurvey from './en/survey.json'
import thDocuments from './th/documents.json'
import enDocuments from './en/documents.json'

function mergeFeatureLocales(base: any, survey: any, documents: any) {
  return {
    ...base,
    features: {
      ...(base.features ?? {}),
      survey: survey.survey,
      documentManagement: documents.documentManagement,
    },
    sidebar: {
      ...base.sidebar,
      items: {
        ...base.sidebar.items,
        documents: documents.sidebar.menuLabel,
        documentViews: documents.sidebar.views,
      },
    },
  }
}

const thMerged = mergeFeatureLocales(th, thSurvey, thDocuments)
const enMerged = mergeFeatureLocales(en, enSurvey, enDocuments)

export const locales = { th: thMerged, en: enMerged }
export type Language = keyof typeof locales

export function getLocale(language: Language) {
  return locales[language] ?? locales.en
}

export type Translations = ReturnType<typeof getLocale>
