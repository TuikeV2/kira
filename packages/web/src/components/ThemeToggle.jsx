import { useTheme } from '../contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = ({ className = '', showLabel = false, size = 'md' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        rounded-lg
        transition-all duration-300
        bg-gray-100 dark:bg-dark-700
        hover:bg-gray-200 dark:hover:bg-dark-600
        text-gray-600 dark:text-gray-300
        hover:text-gray-900 dark:hover:text-white
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
        ${className}
      `}
      aria-label={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
      title={isDark ? 'Tryb jasny' : 'Tryb ciemny'}
    >
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <FaSun
            className={`
              ${iconSizes[size]}
              transition-all duration-300
              ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
              absolute inset-0
              text-amber-500
            `}
          />
          <FaMoon
            className={`
              ${iconSizes[size]}
              transition-all duration-300
              ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
              text-blue-400
            `}
          />
        </div>
        {showLabel && (
          <span className="text-sm font-medium">
            {isDark ? 'Ciemny' : 'Jasny'}
          </span>
        )}
      </div>
    </button>
  );
};

export const ThemeToggleSwitch = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <FaSun className={`w-4 h-4 transition-colors ${isDark ? 'text-gray-500' : 'text-amber-500'}`} />
      <button
        onClick={toggleTheme}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-300
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
          ${isDark ? 'bg-primary-500' : 'bg-gray-300'}
        `}
        role="switch"
        aria-checked={isDark}
        aria-label="Przełącz motyw"
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-300
            ${isDark ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <FaMoon className={`w-4 h-4 transition-colors ${isDark ? 'text-blue-400' : 'text-gray-400'}`} />
    </div>
  );
};

export default ThemeToggle;
