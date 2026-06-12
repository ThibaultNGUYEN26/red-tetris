import en from './en'
import fr from './fr'
import es from './es'
import it from './it'
import de from './de'

export const PLAYER_STATS_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'de', label: 'German' },
]

const translations = {
  en,
  fr,
  es,
  it,
  de,
}

export const DEFAULT_LANGUAGE = 'en'

export const isSupportedLanguage = (language) =>
  Object.prototype.hasOwnProperty.call(translations, language)

export const getPlayerStatsTranslation = (language) =>
  translations[language] || translations[DEFAULT_LANGUAGE]
