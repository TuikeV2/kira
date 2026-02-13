import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService } from '../services/api.service';
import {
  FaKey,
  FaCopy,
  FaCheck,
  FaTimes,
  FaServer,
  FaCrown,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaShoppingCart
} from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { SkeletonCard } from '../components/ui';

export default function MyLicenses() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const response = await purchaseService.getPurchaseHistory();
      setLicenses(response.data.data || []);
    } catch (error) {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (licenseKey, id) => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(id);
    toast.success(t('pages.myLicenses.keyCopied'));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (license) => {
    if (!license.isActive) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-400">
          {t('pages.myLicenses.inactive')}
        </span>
      );
    }
    if (license.isExpired) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
          {t('pages.myLicenses.expired')}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
        {t('pages.myLicenses.active')}
      </span>
    );
  };

  const getUsageBadge = (license) => {
    if (license.inUse) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {t('pages.myLicenses.inUse')}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        {t('pages.myLicenses.notAssigned')}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nigdy';
    return date.toLocaleDateString('pl-PL');
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime())) return null;
    const now = new Date();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-40 h-8 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FaKey className="text-amber-500" />
            {t('pages.myLicenses.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('pages.myLicenses.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/buy')}
          className="btn-primary flex items-center gap-2"
        >
          <FaShoppingCart className="w-4 h-4" />
          {t('pages.myLicenses.buyNew')}
        </button>
      </div>

      {/* Licenses list */}
      {licenses.length === 0 ? (
        <div className="card p-12 text-center">
          <FaCrown className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('pages.myLicenses.noLicenses')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {t('pages.myLicenses.noLicensesDesc')}
          </p>
          <button
            onClick={() => navigate('/buy')}
            className="btn-primary"
          >
            {t('pages.myLicenses.buyVip')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {licenses.map((license) => {
            const daysRemaining = getDaysRemaining(license.expiresAt);
            const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;

            return (
              <div
                key={license.id}
                className={`card p-6 ${license.isExpired ? 'opacity-75' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* License Key */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaKey className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('pages.myLicenses.licenseKey')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 dark:bg-dark-700 px-3 py-2 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                        {license.licenseKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(license.licenseKey, license.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          copiedKey === license.id
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                            : 'bg-gray-100 dark:bg-dark-700 text-gray-500 hover:text-primary-500'
                        }`}
                        title={t('pages.myLicenses.copyKey')}
                      >
                        {copiedKey === license.id ? (
                          <FaCheck className="w-4 h-4" />
                        ) : (
                          <FaCopy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status & Usage */}
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(license)}
                    {getUsageBadge(license)}
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      {license.tier}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Expiration */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        license.isExpired
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : isExpiringSoon
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-gray-100 dark:bg-dark-700'
                      }`}>
                        <FaCalendarAlt className={`w-4 h-4 ${
                          license.isExpired
                            ? 'text-red-500'
                            : isExpiringSoon
                              ? 'text-amber-500'
                              : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.myLicenses.expires')}</p>
                        <p className={`font-medium ${
                          license.isExpired
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {formatDate(license.expiresAt)}
                        </p>
                        {daysRemaining !== null && daysRemaining > 0 && (
                          <p className={`text-xs ${isExpiringSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                            ({daysRemaining} {daysRemaining === 1 ? 'dzien' : 'dni'})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Server */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700">
                        <FaServer className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.myLicenses.server')}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {license.servers && license.servers.length > 0
                            ? license.servers[0].name
                            : t('pages.myLicenses.notAssignedServer')
                          }
                        </p>
                      </div>
                    </div>

                    {/* Created */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700">
                        <FaCrown className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.myLicenses.purchased')}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(license.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning for expiring soon */}
                  {isExpiringSoon && !license.isExpired && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <FaExclamationTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-700 dark:text-amber-300">
                        {t('pages.myLicenses.expiresIn', { days: daysRemaining, daysWord: daysRemaining === 1 ? t('pages.myLicenses.day') : t('pages.myLicenses.days') })}
                      </span>
                      <button
                        onClick={() => navigate('/buy')}
                        className="ml-auto text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        {t('pages.myLicenses.extendNow')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
