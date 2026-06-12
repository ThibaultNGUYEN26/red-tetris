import en from './en'
import fr from './fr'

export const PLAYER_STATS_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
]

const translations = {
  en,
  fr,
}

export const DEFAULT_LANGUAGE = 'en'

export const isSupportedLanguage = (language) =>
  Object.prototype.hasOwnProperty.call(translations, language)

export const getPlayerStatsTranslation = (language) =>
  translations[language] || translations[DEFAULT_LANGUAGE]
