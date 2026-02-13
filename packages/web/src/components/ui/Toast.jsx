import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const toastConfig = {
  success: {
    icon: FaCheckCircle,
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800',
    iconClass: 'text-green-500 dark:text-green-400',
    textClass: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: FaExclamationCircle,
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
    iconClass: 'text-red-500 dark:text-red-400',
    textClass: 'text-red-800 dark:text-red-200',
  },
  info: {
    icon: FaInfoCircle,
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-500 dark:text-blue-400',
    textClass: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    icon: FaExclamationTriangle,
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    iconClass: 'text-yellow-500 dark:text-yellow-400',
    textClass: 'text-yellow-800 dark:text-yellow-200',
  },
};

function ToastItem({ toast, onRemove }) {
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`
        flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
        ${config.bgClass} ${config.borderClass}
        min-w-[300px] max-w-md
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconClass}`} />
      <p className={`flex-1 text-sm font-medium ${config.textClass}`}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${config.iconClass}`}
        aria-label="Close notification"
      >
        <FaTimes className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
