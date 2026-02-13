import { FaInbox } from 'react-icons/fa';

export default function EmptyState({
  icon: Icon = FaInbox,
  title = 'Brak danych',
  description = 'Nie znaleziono zadnych elementow',
  action,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>

      {action && (
        action
      )}

      {!action && actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
