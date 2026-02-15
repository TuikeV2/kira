import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { purchaseService, dashboardService } from '../services/api.service';
import {
  FaUser, FaDiscord, FaKey, FaServer, FaCalendar, FaCrown,
  FaShieldAlt, FaCog, FaSun, FaMoon, FaGlobe
} from 'react-icons/fa';
import { SkeletonCard } from '../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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
    } catch {
      toast.error(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20';
      case 'PREMIUM': return 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20';
      default: return 'bg-white/5 text-gray-400 ring-1 ring-white/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/5 animate-pulse" />
          <div className="space-y-2">
            <div className="w-40 h-6 bg-white/5 rounded animate-pulse" />
            <div className="w-28 h-4 bg-white/5 rounded animate-pulse" />
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
  const registeredServers = servers.filter(s => s.registered);

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Profile Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <div className="relative">
          <img
            src={user.avatar
              ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
              : 'https://cdn.discordapp.com/embed/avatars/0.png'
            }
            alt={user.username}
            className="w-20 h-20 rounded-2xl border-2 border-white/10 shadow-lg object-cover"
          />
          {activeLicense && (
            <div className="absolute -bottom-1 -right-1 p-1 bg-dark-950 rounded-lg border border-white/10">
              <FaCrown className="w-3.5 h-3.5 text-purple-400" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-sm">
            <FaDiscord className="text-[#5865F2]" />
            {user.discordId}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <motion.div variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15 ring-1 ring-blue-500/20">
                <FaUser className="w-3.5 h-3.5 text-blue-400" />
              </div>
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
          </GlassCard>
        </motion.div>

        {/* License Status */}
        <motion.div variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/15 ring-1 ring-yellow-500/20">
                <FaKey className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              {t('pages.account.licenseStatus')}
            </h2>
            {activeLicense ? (
              <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <FaCrown className="text-2xl text-purple-400" />
                  <div>
                    <p className="font-bold text-lg text-white">{activeLicense.tier}</p>
                    <p className="text-sm text-gray-400">{t('pages.account.activeLicense')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('pages.account.maxServers')}</p>
                    <p className="font-bold text-white">{activeLicense.maxServers === -1 ? t('common.unlimited') : activeLicense.maxServers}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('pages.account.expires')}</p>
                    <p className="font-bold text-white">
                      {activeLicense.expiresAt
                        ? new Date(activeLicense.expiresAt).toLocaleDateString()
                        : t('common.neverExpires')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 ring-1 ring-white/10 mx-auto mb-3">
                  <FaShieldAlt className="text-2xl text-gray-500" />
                </div>
                <p className="text-gray-400 mb-4">{t('pages.account.noActiveLicense')}</p>
                <Link to="/buy" className="btn-primary btn-sm">
                  {t('pages.account.buyLicense')}
                </Link>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 ring-1 ring-white/10">
              <FaCog className="w-3.5 h-3.5 text-gray-400" />
            </div>
            {t('pages.account.settings')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 ml-10">{t('pages.account.settingsDescription')}</p>

          <div className="space-y-5">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-yellow-500/15 text-yellow-400')}>
                  {isDark ? <FaMoon className="w-3.5 h-3.5" /> : <FaSun className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{t('pages.account.theme')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isDark ? t('pages.account.darkModeLabel') : t('pages.account.lightMode')}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  isDark ? 'bg-primary-500' : 'bg-gray-300 dark:bg-white/20'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  isDark ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            <div className="border-t border-white/5" />

            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-400">
                  <FaGlobe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{t('pages.account.languageLabel')}</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select w-auto min-w-[120px]"
              >
                <option value="pl">{t('common.polish')}</option>
                <option value="en">{t('common.english')}</option>
              </select>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Servers */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/15 ring-1 ring-green-500/20">
              <FaServer className="w-3.5 h-3.5 text-green-400" />
            </div>
            {t('pages.account.yourServers')} ({registeredServers.length})
          </h2>
          {registeredServers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {registeredServers.slice(0, 6).map((server) => (
                <Link
                  key={server.id}
                  to={`/servers/${server.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
                >
                  <img
                    src={server.icon
                      ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64`
                      : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={server.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate text-sm">{server.name}</p>
                    <p className="text-xs text-gray-500">
                      {server.memberCount?.toLocaleString() || '?'} {t('pages.account.membersCount')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              {t('pages.account.noServersWithBot')}
            </p>
          )}
          {registeredServers.length > 6 && (
            <Link
              to="/servers"
              className="block text-center text-primary-400 hover:text-primary-300 mt-4 text-sm transition-colors"
            >
              {t('pages.account.viewAllServers')} ({registeredServers.length})
            </Link>
          )}
        </GlassCard>
      </motion.div>

      {/* License History */}
      {licenses.length > 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/15 ring-1 ring-purple-500/20">
                <FaCalendar className="w-3.5 h-3.5 text-purple-400" />
              </div>
              {t('pages.account.licenseHistory')}
            </h2>
            <div className="space-y-3">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border',
                    license.isActive
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-white/5 bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', getTierBadge(license.tier))}>
                      {license.tier}
                    </span>
                    <code className="text-sm font-mono text-gray-500">
                      {license.licenseKey?.slice(0, 8)}...
                    </code>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-medium',
                      license.isActive ? 'text-green-400' : 'text-gray-500'
                    )}>
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
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}

function InfoRow({ label, value, mono, last }) {
  return (
    <div className={cn('flex justify-between items-center py-2', !last && 'border-b border-white/5')}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn('font-medium text-gray-900 dark:text-white', mono && 'font-mono text-sm')}>{value}</span>
    </div>
  );
}
