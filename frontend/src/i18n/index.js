import en from './en'
import fr from './fr'
import es from './es'

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
]

const translations = {
  en,
  fr,
  es,
}

export const isSupportedLanguage = (language) =>
  Object.prototype.hasOwnProperty.call(translations, language)

export const getTranslation = (language) =>
  translations[language] || translations[DEFAULT_LANGUAGE]

export const getPlayerStatsTranslation = (language) =>
  getTranslation(language).playerStats
