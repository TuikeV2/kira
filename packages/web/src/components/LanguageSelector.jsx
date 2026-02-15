import { useState, useRef, useEffect } from 'react';
import { FaGlobe, FaCheck } from 'react-icons/fa';
import { useTranslation } from '../contexts/LanguageContext';

const FLAGS = {
  pl: '🇵🇱',
  en: '🇬🇧',
};

export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find(l => l.code === language);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 rounded-lg transition-all duration-200
          ${compact
            ? 'p-2 hover:bg-gray-100 dark:hover:bg-dark-700'
            : 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-600'
          }
        `}
        title={currentLang?.nativeName}
      >
        <span className="text-lg">{FLAGS[language]}</span>
        {!compact && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentLang?.nativeName}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700 py-2 z-50 animate-fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                transition-colors duration-150
                ${language === lang.code
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                }
              `}
            >
              <span className="text-lg">{FLAGS[lang.code]}</span>
              <span className="flex-1 font-medium">{lang.nativeName}</span>
              {language === lang.code && (
                <FaCheck className="w-4 h-4 text-primary-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
