import en from './en'
import fr from './fr'
import es from './es'
import it from './it'
import de from './de'
import ar from './ar'
import vi from './vi'
import zh from './zh'

export const DEFAULT_LANGUAGE = 'en'

export const RTL_LANGUAGES = new Set(['ar'])

export const LANGUAGES = [
  { code: 'ar', label: 'العربية', flag: '🇲🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
]

const LANGUAGE_NAMES = {
  en: {
    ar: 'Arabic',
    de: 'German',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    vi: 'Vietnamese',
    zh: 'Chinese',
  },
  fr: {
    ar: 'Arabe',
    de: 'Allemand',
    en: 'Anglais',
    es: 'Espagnol',
    fr: 'Français',
    it: 'Italien',
    vi: 'Vietnamien',
    zh: 'Chinois',
  },
  es: {
    ar: 'Árabe',
    de: 'Alemán',
    en: 'Inglés',
    es: 'Español',
    fr: 'Francés',
    it: 'Italiano',
    vi: 'Vietnamita',
    zh: 'Chino',
  },
  it: {
    ar: 'Arabo',
    de: 'Tedesco',
    en: 'Inglese',
    es: 'Spagnolo',
    fr: 'Francese',
    it: 'Italiano',
    vi: 'Vietnamita',
    zh: 'Cinese',
  },
  de: {
    ar: 'Arabisch',
    de: 'Deutsch',
    en: 'Englisch',
    es: 'Spanisch',
    fr: 'Französisch',
    it: 'Italienisch',
    vi: 'Vietnamesisch',
    zh: 'Chinesisch',
  },
  ar: {
    ar: 'العربية',
    de: 'الألمانية',
    en: 'الإنجليزية',
    es: 'الإسبانية',
    fr: 'الفرنسية',
    it: 'الإيطالية',
    vi: 'الفيتنامية',
    zh: 'الصينية',
  },
  vi: {
    ar: 'Tiếng Ả Rập',
    de: 'Tiếng Đức',
    en: 'Tiếng Anh',
    es: 'Tiếng Tây Ban Nha',
    fr: 'Tiếng Pháp',
    it: 'Tiếng Ý',
    vi: 'Tiếng Việt',
    zh: 'Tiếng Trung',
  },
  zh: {
    ar: '阿拉伯语',
    de: '德语',
    en: '英语',
    es: '西班牙语',
    fr: '法语',
    it: '意大利语',
    vi: '越南语',
    zh: '中文',
  },
}

const translations = {
  en,
  fr,
  es,
  it,
  de,
  ar,
  vi,
  zh,
}

export const isSupportedLanguage = (language) =>
  Object.prototype.hasOwnProperty.call(translations, language)

export const getTranslation = (language) =>
  translations[language] || translations[DEFAULT_LANGUAGE]

export const getLanguageName = (languageCode, displayLanguage = DEFAULT_LANGUAGE) =>
  LANGUAGE_NAMES[displayLanguage]?.[languageCode] ||
  LANGUAGE_NAMES[DEFAULT_LANGUAGE]?.[languageCode] ||
  languageCode

export const getLanguageFlag = (languageCode) =>
  LANGUAGES.find((l) => l.code === languageCode)?.flag || ''

export const getPlayerStatsTranslation = (language) =>
  getTranslation(language).playerStats
