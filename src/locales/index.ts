import th from './th/common.json'
import en from './en/common.json'

export const locales = { th, en }

export function getLocale(language) {
  return locales[language] ?? locales.en
}
