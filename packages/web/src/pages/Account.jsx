import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { purchaseService, dashboardService } from '../services/api.service';
import { FaUser, FaDiscord, FaKey, FaServer, FaCalendar, FaCrown, FaShieldAlt, FaCog, FaSun, FaMoon, FaGlobe, FaBell } from 'react-icons/fa';
import { PageHeader, SkeletonCard } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

export default function Account() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const [licenses, setLicenses] = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [licensesRes, serversRes] = await Promise.all([
        purchaseService.getPurchaseHistory().catch(() => ({ data: { data: [] } })),
        dashboardService.getUserGuilds().catch(() => ({ data: { data: [] } }))
      ]);
      setLicenses(licensesRes.data.data || []);
      setServers(serversRes.data.data || []);
    } catch (error) {
      toast.error(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'VIP': return 'from-purple-500 to-pink-500';
      case 'PREMIUM': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'PREMIUM': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-dark-700 animate-pulse" />
          <div className="space-y-2">
            <div className="w-40 h-6 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
            <div className="w-28 h-4 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const activeLicense = licenses.find(l => l.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={user.username}
        avatar={{
          src: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
            : 'https://cdn.discordapp.com/embed/avatars/0.png',
          alt: `Avatar ${user.username}`,
          badge: true
        }}
      >
        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <FaDiscord className="text-[#5865F2]" />
          {user.discordId}
        </p>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaUser className="text-blue-500" />
            {t('pages.account.accountInfo')}
          </h2>
          <div className="space-y-4">
            <InfoRow label={t('pages.account.name')} value={user.username} />
            <InfoRow label={t('pages.account.email')} value={user.email || t('pages.account.noEmail')} />
            <InfoRow label={t('pages.account.discordId')} value={user.discordId} mono />
            <InfoRow
              label={t('pages.account.createdAt')}
              value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              last
            />
          </div>
        </div>

        {/* License Status */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaKey className="text-yellow-500" />
            {t('pages.account.licenseStatus')}
          </h2>
          {activeLicense ? (
            <div className={`bg-gradient-to-r ${getTierColor(activeLicense.tier)} rounded-xl p-4 text-white`}>
              <div className="flex items-center gap-3 mb-3">
                <FaCrown className="text-2xl" />
                <div>
                  <p className="font-bold text-lg">{activeLicense.tier}</p>
                  <p className="text-sm opacity-90">{t('pages.account.activeLicense')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="opacity-75">{t('pages.account.maxServers')}</p>
                  <p className="font-bold">{activeLicense.maxServers === -1 ? t('common.unlimited') : activeLicense.maxServers}</p>
                </div>
                <div>
                  <p className="opacity-75">{t('pages.account.expires')}</p>
                  <p className="font-bold">
                    {activeLicense.expiresAt
                      ? new Date(activeLicense.expiresAt).toLocaleDateString()
                      : t('common.neverExpires')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FaShieldAlt className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('pages.account.noActiveLicense')}</p>
              <a href="/buy" className="inline-block mt-4 btn-primary">
                {t('pages.account.buyLicense')}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <FaCog className="text-gray-500" />
          {t('pages.account.settings')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('pages.account.settingsDescription')}</p>

        <div className="space-y-5">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <FaMoon className="text-purple-400" /> : <FaSun className="text-yellow-500" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t('pages.account.theme')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isDark ? t('pages.account.darkModeLabel') : t('pages.account.lightMode')}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-purple-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-dark-700" />

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaGlobe className="text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t('pages.account.languageLabel')}</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="pl">{t('common.polish')}</option>
              <option value="en">{t('common.english')}</option>
              <option value="ru">{t('common.russian')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Servers */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FaServer className="text-green-500" />
          {t('pages.account.yourServers')} ({servers.length})
        </h2>
        {servers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.slice(0, 6).map((server) => (
              <a
                key={server.id}
                href={`/servers/${server.id}`}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
              >
                <img
                  src={server.icon
                    ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={server.name}
                  className="w-10 h-10 rounded-lg"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{server.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {server.memberCount?.toLocaleString() || '?'} {t('pages.account.membersCount')}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('pages.account.noServersWithBot')}
          </p>
        )}
        {servers.length > 6 && (
          <a
            href="/servers"
            className="block text-center text-blue-600 dark:text-blue-400 hover:underline mt-4"
          >
            {t('pages.account.viewAllServers')} ({servers.length})
          </a>
        )}
      </div>

      {/* License History */}
      {licenses.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaCalendar className="text-purple-500" />
            {t('pages.account.licenseHistory')}
          </h2>
          <div className="space-y-3">
            {licenses.map((license) => (
              <div
                key={license.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  license.isActive
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getTierBadge(license.tier)}`}>
                    {license.tier}
                  </span>
                  <code className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {license.licenseKey?.slice(0, 8)}...
                  </code>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${license.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {license.isActive ? t('pages.account.active') : t('pages.account.inactive')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {license.expiresAt
                      ? `${t('pages.account.expires')}: ${new Date(license.expiresAt).toLocaleDateString()}`
                      : t('pages.account.lifetime')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, last }) {
  return (
    <div className={`flex justify-between items-center py-2 ${!last ? 'border-b border-gray-100 dark:border-dark-700' : ''}`}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}
