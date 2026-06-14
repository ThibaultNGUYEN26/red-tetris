import en from './en'
import fr from './fr'
import es from './es'
import it from './it'

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
]

const LANGUAGE_NAMES = {
  en: {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
  },
  fr: {
    en: 'Anglais',
    fr: 'Français',
    es: 'Espagnol',
    it: 'Italien',
  },
  es: {
    en: 'Inglés',
    fr: 'Francés',
    es: 'Español',
    it: 'Italiano',
  },
  it: {
    en: 'Inglese',
    fr: 'Francese',
    es: 'Spagnolo',
    it: 'Italiano',
  },
}

const translations = {
  en,
  fr,
  es,
  it,
}

export const isSupportedLanguage = (language) =>
  Object.prototype.hasOwnProperty.call(translations, language)

export const getTranslation = (language) =>
  translations[language] || translations[DEFAULT_LANGUAGE]

export const getLanguageName = (languageCode, displayLanguage = DEFAULT_LANGUAGE) =>
  LANGUAGE_NAMES[displayLanguage]?.[languageCode] ||
  LANGUAGE_NAMES[DEFAULT_LANGUAGE]?.[languageCode] ||
  languageCode

export const getPlayerStatsTranslation = (language) =>
  getTranslation(language).playerStats
