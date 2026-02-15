import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { purchaseService, dashboardService } from '../services/api.service';
import {
  FaServer, FaKey, FaCalendarAlt, FaShoppingCart, FaChevronRight,
  FaExclamationTriangle, FaRocket, FaCrown, FaTicketAlt
} from 'react-icons/fa';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassStatCard } from '../components/ui/GlassStatCard';
import { SkeletonStats, SkeletonCard } from '../components/ui';
import { cn } from '../lib/utils';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [serversRes, licensesRes] = await Promise.all([
        dashboardService.getUserGuilds().catch(() => ({ data: { data: [] } })),
        purchaseService.getPurchaseHistory().catch(() => ({ data: { data: [] } }))
      ]);
      setServers(serversRes.data.data || []);
      setLicenses(licensesRes.data.data || []);
    } catch {
      // handled by individual catches
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeLicenses = licenses.filter(l => l.isActive);
  const expiringLicense = activeLicenses.find(l => {
    if (!l.expiresAt) return false;
    const daysLeft = Math.ceil((new Date(l.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  });
  const daysToExpire = expiringLicense
    ? Math.ceil((new Date(expiringLicense.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const activeServers = servers.filter(s => s.registered && s.isActive && s.license);

  const quickActions = [
    { label: t('nav.servers') || 'My Servers', icon: FaServer, path: '/servers', color: 'cyan' },
    { label: t('nav.activateLicense') || 'Activate License', icon: FaTicketAlt, path: '/activate', color: 'green' },
    { label: t('nav.buyLicense') || 'Buy License', icon: FaShoppingCart, path: '/buy', color: 'purple' },
    { label: t('nav.licenses') || 'My Licenses', icon: FaKey, path: '/my-licenses', color: 'yellow' },
  ];

  const actionColorMap = {
    cyan: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20',
    green: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/20',
    purple: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20',
  };

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Welcome */}
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <div className="relative">
          <img
            src={user?.avatar
              ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
              : 'https://cdn.discordapp.com/embed/avatars/0.png'
            }
            alt={user?.username}
            className="w-14 h-14 rounded-2xl border-2 border-white/10 shadow-lg object-cover"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-950" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('pages.dashboard.welcome') || 'Welcome'}, {user?.username}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('pages.dashboard.welcomeSubtitle') || 'Here is an overview of your KiraEvo panel'}
          </p>
        </div>
      </motion.div>

      {/* License Expiry Warning */}
      {expiringLicense && (
        <motion.div variants={fadeUp}>
          <GlassCard className="border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
                <FaExclamationTriangle className="text-amber-400 w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-200">
                  {t('pages.dashboard.licenseExpiring') || 'Your license expires soon!'}
                </p>
                <p className="text-sm text-amber-300/70">
                  {daysToExpire} {daysToExpire === 1 ? (t('pages.myLicenses.day') || 'day') : (t('pages.myLicenses.days') || 'days')} {t('pages.dashboard.remaining') || 'remaining'}
                </p>
              </div>
              <Link to="/buy" className="btn-primary btn-sm flex-shrink-0">
                {t('pages.myLicenses.extendNow') || 'Extend now'}
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Stats */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassStatCard
            title={t('pages.dashboard.yourServers') || 'Your Servers'}
            value={activeServers.length}
            icon={FaServer}
            color="cyan"
            subtitle={`${servers.length} ${t('pages.dashboard.total') || 'total'}`}
          />
          <GlassStatCard
            title={t('pages.dashboard.activeLicenses') || 'Active Licenses'}
            value={activeLicenses.length}
            icon={FaKey}
            color="green"
            subtitle={`${licenses.length} ${t('pages.dashboard.purchased') || 'purchased'}`}
          />
          <GlassStatCard
            title={t('pages.dashboard.daysToExpire') || 'Days to Expire'}
            value={daysToExpire ?? 0}
            icon={FaCalendarAlt}
            color={daysToExpire && daysToExpire <= 7 ? 'red' : 'yellow'}
            subtitle={expiringLicense ? expiringLicense.tier : (t('pages.dashboard.noExpiry') || 'No expiring license')}
          />
          <GlassCard className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {t('pages.dashboard.currentTier') || 'Current Tier'}
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeLicenses[0]?.tier || '-'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {activeLicenses.length > 0 ? (t('pages.account.activeLicense') || 'Active') : (t('pages.dashboard.noLicense') || 'No license')}
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl ring-1 bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/20">
                <FaCrown className="h-5 w-5" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('pages.dashboard.quickActions') || 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <GlassCard hover className="p-4 flex flex-col items-center gap-3 text-center">
                <div className={cn('p-3 rounded-xl', actionColorMap[action.color])}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
              </GlassCard>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Servers */}
      {!loading && activeServers.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('pages.dashboard.recentServers') || 'Your Servers'}
            </h2>
            <Link to="/servers" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              {t('pages.dashboard.viewAll') || 'View all'} <FaChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeServers.slice(0, 4).map((server) => (
              <Link key={server.id} to={`/servers/${server.id}`}>
                <GlassCard hover className="p-4 flex items-center gap-4">
                  <img
                    src={server.icon
                      ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64`
                      : 'https://cdn.discordapp.com/embed/avatars/0.png'
                    }
                    alt={server.name}
                    className="w-12 h-12 rounded-xl shadow-sm object-cover"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{server.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {server.memberCount?.toLocaleString() || '?'} {(t('common.members') || 'members').toLowerCase()}
                    </p>
                  </div>
                  {server.license && (
                    <span className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold',
                      server.license.tier === 'VIP'
                        ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20'
                        : 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20'
                    )}>
                      {server.license.tier}
                    </span>
                  )}
                  <FaChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
                </GlassCard>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* No servers CTA */}
      {!loading && activeServers.length === 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/20 mx-auto mb-4">
              <FaRocket className="w-7 h-7 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('pages.dashboard.getStarted') || 'Get Started with KiraEvo'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {t('pages.dashboard.getStartedDesc') || 'Add the bot to your server and activate a license to unlock all features'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/buy" className="btn-primary">
                {t('nav.buyLicense') || 'Buy License'}
              </Link>
              <Link to="/servers" className="btn-secondary">
                {t('nav.servers') || 'My Servers'}
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}
