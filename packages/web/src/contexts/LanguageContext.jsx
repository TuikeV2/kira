import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Import translations from shared package (copied for web build)
import pl from '../i18n/pl.json';
import en from '../i18n/en.json';
import ru from '../i18n/ru.json';

const translations = { pl, en, ru };

const SUPPORTED_LANGUAGES = ['pl', 'en', 'ru'];
const DEFAULT_LANGUAGE = 'pl';
const STORAGE_KEY = 'kira_language';

const LanguageContext = createContext(null);

/**
 * Get nested value from object by dot notation path
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }

  return result;
}

/**
 * Interpolate variables into string
 */
function interpolate(str, variables = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
        return stored;
      }
      // Try browser language
      const browserLang = navigator.language?.split('-')[0];
      if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        return browserLang;
      }
    }
    return DEFAULT_LANGUAGE;
  });

  // Save to localStorage when language changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      setLanguageState(lang);
    }
  }, []);

  /**
   * Translate a key
   * @param {string} key - Dot notation key (e.g., 'common.save')
   * @param {Object} variables - Variables to interpolate
   * @returns {string} Translated string
   */
  const t = useCallback((key, variables = {}) => {
    const translation = translations[language];
    if (!translation) return key;

    let result = getNestedValue(translation, key);

    // Fallback to default language if not found
    if (result === undefined && language !== DEFAULT_LANGUAGE) {
      result = getNestedValue(translations[DEFAULT_LANGUAGE], key);
    }

    // If still not found, return key
    if (result === undefined) {
      return key;
    }

    return interpolate(result, variables);
  }, [language]);

  /**
   * Get a namespace object for bulk translations
   */
  const getNamespace = useCallback((namespace) => {
    const translation = translations[language];
    if (!translation) return {};

    let result = getNestedValue(translation, namespace);

    if (result === undefined && language !== DEFAULT_LANGUAGE) {
      result = getNestedValue(translations[DEFAULT_LANGUAGE], namespace);
    }

    return typeof result === 'object' ? result : {};
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    getNamespace,
    languages: SUPPORTED_LANGUAGES.map(code => ({
      code,
      name: translations[code]?.common?.language || code,
      nativeName: code === 'pl' ? 'Polski' : code === 'en' ? 'English' : 'Русский'
    }))
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access translation functions
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook to access just the t function (for performance)
 */
export function useT() {
  const { t } = useTranslation();
  return t;
}

export default LanguageContext;
