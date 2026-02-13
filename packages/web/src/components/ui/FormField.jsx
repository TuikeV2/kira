import { FaExclamationCircle } from 'react-icons/fa';

export default function FormField({
  label,
  error,
  required = false,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {children}

      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <FaExclamationCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Input with built-in validation styling
export function Input({
  error,
  className = '',
  ...props
}) {
  return (
    <input
      className={`
        input
        ${error ? 'border-red-300 dark:border-red-500 focus:ring-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  );
}

// Select with built-in validation styling
export function Select({
  error,
  children,
  className = '',
  ...props
}) {
  return (
    <select
      className={`
        select
        ${error ? 'border-red-300 dark:border-red-500 focus:ring-red-500' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
}

// Textarea with built-in validation styling
export function Textarea({
  error,
  className = '',
  ...props
}) {
  return (
    <textarea
      className={`
        input min-h-[100px] resize-y
        ${error ? 'border-red-300 dark:border-red-500 focus:ring-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  );
}
