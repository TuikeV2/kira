import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { purchaseService, dashboardService } from '../services/api.service';
import { FaServer, FaKey, FaCalendarAlt, FaShoppingCart, FaChevronRight, FaExclamationTriangle, FaRocket, FaCrown, FaTicketAlt } from 'react-icons/fa';
import StatCard from '../components/StatCard';
import { SkeletonStats, SkeletonCard } from '../components/ui';

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
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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
    { label: t('nav.servers') || 'My Servers', icon: FaServer, path: '/servers', color: 'bg-blue-500' },
    { label: t('nav.activateLicense') || 'Activate License', icon: FaTicketAlt, path: '/activate', color: 'bg-green-500' },
    { label: t('nav.buyLicense') || 'Buy License', icon: FaShoppingCart, path: '/buy', color: 'bg-purple-500' },
    { label: t('nav.licenses') || 'My Licenses', icon: FaKey, path: '/my-licenses', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <img
          src={user?.avatar
            ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
            : 'https://cdn.discordapp.com/embed/avatars/0.png'
          }
          alt={user?.username}
          className="w-14 h-14 rounded-2xl border-2 border-white dark:border-dark-700 shadow-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('pages.dashboard.welcome') || 'Welcome'}, {user?.username}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('pages.dashboard.welcomeSubtitle') || 'Here is an overview of your KiraEvo panel'}
          </p>
        </div>
      </div>

      {/* License Expiry Warning */}
      {expiringLicense && (
        <div className="card border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {t('pages.dashboard.licenseExpiring') || 'Your license expires soon!'}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {daysToExpire} {daysToExpire === 1 ? (t('pages.myLicenses.day') || 'day') : (t('pages.myLicenses.days') || 'days')} {t('pages.dashboard.remaining') || 'remaining'}
              </p>
            </div>
            <Link to="/buy" className="btn-primary btn-sm flex-shrink-0">
              {t('pages.myLicenses.extendNow') || 'Extend now'}
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('pages.dashboard.yourServers') || 'Your Servers'}
            value={activeServers.length}
            icon={FaServer}
            color="blue"
            subtitle={`${servers.length} ${t('pages.dashboard.total') || 'total'}`}
          />
          <StatCard
            title={t('pages.dashboard.activeLicenses') || 'Active Licenses'}
            value={activeLicenses.length}
            icon={FaKey}
            color="green"
            subtitle={`${licenses.length} ${t('pages.dashboard.purchased') || 'purchased'}`}
          />
          <StatCard
            title={t('pages.dashboard.daysToExpire') || 'Days to Expire'}
            value={daysToExpire ?? '∞'}
            icon={FaCalendarAlt}
            color={daysToExpire && daysToExpire <= 7 ? 'red' : 'yellow'}
            subtitle={expiringLicense ? expiringLicense.tier : (t('pages.dashboard.noExpiry') || 'No expiring license')}
          />
          <StatCard
            title={t('pages.dashboard.currentTier') || 'Current Tier'}
            value={activeLicenses[0]?.tier || '-'}
            icon={FaCrown}
            color="purple"
            subtitle={activeLicenses.length > 0 ? (t('pages.account.activeLicense') || 'Active') : (t('pages.dashboard.noLicense') || 'No license')}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('pages.dashboard.quickActions') || 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="card p-4 flex flex-col items-center gap-3 text-center hover:shadow-soft-lg dark:hover:shadow-dark-lg transition-all group"
            >
              <div className={`${action.color} p-3 rounded-xl text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Servers */}
      {!loading && activeServers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('pages.dashboard.recentServers') || 'Your Servers'}
            </h2>
            <Link to="/servers" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              {t('pages.dashboard.viewAll') || 'View all'} <FaChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeServers.slice(0, 4).map((server) => (
              <Link
                key={server.id}
                to={`/servers/${server.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-soft-lg dark:hover:shadow-dark-lg transition-all group"
              >
                <img
                  src={server.icon
                    ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt={server.name}
                  className="w-12 h-12 rounded-xl shadow-sm"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{server.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {server.memberCount?.toLocaleString() || '?'} {t('common.members').toLowerCase()}
                  </p>
                </div>
                {server.license && (
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    server.license.tier === 'VIP'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {server.license.tier}
                  </span>
                )}
                <FaChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No servers CTA */}
      {!loading && activeServers.length === 0 && (
        <div className="card p-8 text-center">
          <FaRocket className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('pages.dashboard.getStarted') || 'Get Started with KiraEvo'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t('pages.dashboard.getStartedDesc') || 'Add the bot to your server and activate a license to unlock all features'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/buy" className="btn-gradient">
              {t('nav.buyLicense') || 'Buy License'}
            </Link>
            <Link to="/servers" className="btn-secondary">
              {t('nav.servers') || 'My Servers'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
