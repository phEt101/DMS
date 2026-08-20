import th from './th/common.json'
import en from './en/common.json'

export const locales = { th, en }
export type Language = keyof typeof locales

export function getLocale(language: Language) {
  return locales[language] ?? locales.en
}
