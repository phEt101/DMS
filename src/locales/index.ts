import th from './th/common.json'
import en from './en/common.json'
import thSurvey from './th/survey.json'
import enSurvey from './en/survey.json'
import thDocuments from './th/documents.json'
import enDocuments from './en/documents.json'
import thAnnouncements from './th/announcements.json'
import enAnnouncements from './en/announcements.json'

function mergeFeatureLocales(base: any, survey: any, documents: any, announcements: any) {
  return {
    ...base,
    features: {
      ...(base.features ?? {}),
      survey: survey.survey,
      documentManagement: documents.documentManagement,
      payslips: documents.payslips,
      announcements: announcements.announcements,
    },
    sidebar: {
      ...base.sidebar,
      items: {
        ...base.sidebar.items,
        documents: documents.sidebar.menuLabel,
        documentViews: documents.sidebar.views,
        announcements: announcements.sidebarLabel,
      },
    },
  }
}

const thMerged = mergeFeatureLocales(th, thSurvey, thDocuments, thAnnouncements)
const enMerged = mergeFeatureLocales(en, enSurvey, enDocuments, enAnnouncements)

export const locales = { th: thMerged, en: enMerged }
export type Language = keyof typeof locales

export function getLocale(language: Language) {
  return locales[language] ?? locales.en
}

export type Translations = ReturnType<typeof getLocale>
