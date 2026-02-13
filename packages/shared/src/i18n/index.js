const pl = require('./translations/pl.json');
const en = require('./translations/en.json');
const ru = require('./translations/ru.json');

const translations = { pl, en, ru };

const SUPPORTED_LANGUAGES = ['pl', 'en', 'ru'];
const DEFAULT_LANGUAGE = 'pl';

/**
 * Get a translation string by key path
 * @param {string} key - Dot notation key (e.g., 'common.save', 'bot.commands.ping.description')
 * @param {string} locale - Language code (pl, en, ru)
 * @param {Object} variables - Variables to interpolate (e.g., { user: 'John' })
 * @returns {string} Translated string
 */
function t(key, locale = DEFAULT_LANGUAGE, variables = {}) {
  // Validate locale
  const lang = SUPPORTED_LANGUAGES.includes(locale) ? locale : DEFAULT_LANGUAGE;

  // Get translation object for language
  const translation = translations[lang];
  if (!translation) {
    return key;
  }

  // Navigate to nested key
  const keys = key.split('.');
  let result = translation;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      // Key not found, try fallback to default language
      if (lang !== DEFAULT_LANGUAGE) {
        return t(key, DEFAULT_LANGUAGE, variables);
      }
      return key;
    }
  }

  // If result is not a string, return key
  if (typeof result !== 'string') {
    return key;
  }

  // Interpolate variables
  return interpolate(result, variables);
}

/**
 * Interpolate variables into a string
 * @param {string} str - String with {variable} placeholders
 * @param {Object} variables - Variables to replace
 * @returns {string} Interpolated string
 */
function interpolate(str, variables = {}) {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

/**
 * Get all translations for a specific language
 * @param {string} locale - Language code
 * @returns {Object} Translation object
 */
function getTranslations(locale = DEFAULT_LANGUAGE) {
  const lang = SUPPORTED_LANGUAGES.includes(locale) ? locale : DEFAULT_LANGUAGE;
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}

/**
 * Get a nested translation object
 * @param {string} namespace - Dot notation namespace (e.g., 'bot.commands')
 * @param {string} locale - Language code
 * @returns {Object} Nested translation object
 */
function getNamespace(namespace, locale = DEFAULT_LANGUAGE) {
  const lang = SUPPORTED_LANGUAGES.includes(locale) ? locale : DEFAULT_LANGUAGE;
  const translation = translations[lang];

  if (!translation) return {};

  const keys = namespace.split('.');
  let result = translation;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return {};
    }
  }

  return typeof result === 'object' ? result : {};
}

/**
 * Create a translator function bound to a specific locale
 * @param {string} locale - Language code
 * @returns {Function} Bound translator function
 */
function createTranslator(locale = DEFAULT_LANGUAGE) {
  return (key, variables = {}) => t(key, locale, variables);
}

/**
 * Check if a language is supported
 * @param {string} locale - Language code
 * @returns {boolean}
 */
function isSupported(locale) {
  return SUPPORTED_LANGUAGES.includes(locale);
}

/**
 * Get language name in its own language
 * @param {string} locale - Language code
 * @returns {string} Language name
 */
function getLanguageName(locale) {
  const names = {
    pl: 'Polski',
    en: 'English',
    ru: 'Русский'
  };
  return names[locale] || locale;
}

/**
 * Get all supported languages with their names
 * @returns {Array} Array of { code, name } objects
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map(code => ({
    code,
    name: getLanguageName(code)
  }));
}

module.exports = {
  t,
  getTranslations,
  getNamespace,
  createTranslator,
  isSupported,
  getLanguageName,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  translations
};
