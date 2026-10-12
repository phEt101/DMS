import th from './th/common.json'
import en from './en/common.json'
import thSurvey from './th/survey.json'
import enSurvey from './en/survey.json'

function mergeSurvey(base: any, survey: any) {
  return {
    ...base,
    features: {
      ...(base.features ?? {}),
      survey: survey.survey,
    },
  }
}

const thMerged = mergeSurvey(th, thSurvey)
const enMerged = mergeSurvey(en, enSurvey)

export const locales = { th: thMerged, en: enMerged }
export type Language = keyof typeof locales

export function getLocale(language: Language) {
  return locales[language] ?? locales.en
}

export type Translations = ReturnType<typeof getLocale>
