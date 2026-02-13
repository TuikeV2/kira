import Modal from './Modal';
import { FaExclamationTriangle, FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';

const variantConfig = {
  danger: {
    icon: FaExclamationTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBtn: 'btn-danger',
    confirmText: 'Usun',
  },
  warning: {
    icon: FaExclamationTriangle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors',
    confirmText: 'Kontynuuj',
  },
  info: {
    icon: FaQuestionCircle,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn: 'btn-primary',
    confirmText: 'Potwierdz',
  },
};

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  variant = 'info',
  confirmText,
  cancelText = 'Anuluj',
  loading = false,
}) {
  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm" showCloseButton={false}>
      <div className="text-center">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={config.confirmBtn}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Przetwarzanie...
              </span>
            ) : (
              confirmText || config.confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
