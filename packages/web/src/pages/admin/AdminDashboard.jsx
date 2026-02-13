import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaUsers, FaServer, FaKey, FaTerminal, FaShieldAlt, FaUserPlus,
  FaArrowRight, FaChartLine, FaBox, FaChartBar
} from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import StatCard from '../../components/StatCard';
import { AnimatedCard } from '../../components/animated';
import { SkeletonStats, SkeletonTable } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--tooltip-bg, #1f2937)',
  border: 'none',
  borderRadius: '8px',
  color: 'var(--tooltip-text, #fff)'
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await adminService.getDashboard();
      setData(response.data.data);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-48 h-8 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
          <div className="w-32 h-5 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
        </div>
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6"><SkeletonTable rows={4} /></div>
          <div className="card p-6"><SkeletonTable rows={4} /></div>
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: t('adminDashboard.users') || 'Uzytkownicy', path: '/admin/users', icon: FaUsers, color: 'text-blue-500' },
    { label: t('adminDashboard.servers') || 'Serwery', path: '/admin/servers', icon: FaServer, color: 'text-green-500' },
    { label: t('adminDashboard.products') || 'Produkty', path: '/admin/products', icon: FaBox, color: 'text-purple-500' },
    { label: t('adminDashboard.statistics') || 'Statystyki', path: '/admin/stats', icon: FaChartBar, color: 'text-amber-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{t('adminDashboard.title') || 'Panel Admina'}</h1>
          <p className="page-subtitle">{t('adminDashboard.subtitle') || 'Rozszerzony przeglad systemu'}</p>
        </div>
      </div>

      {/* Stats Grid - 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t('adminDashboard.totalUsers') || 'Uzytkownicy'}
          value={data?.totalUsers || 0}
          icon={FaUsers}
          color="blue"
          trend={data?.trends?.users?.direction !== 'none' ? data?.trends?.users?.direction : undefined}
          trendValue={data?.trends?.users?.value}
        />
        <StatCard
          title={t('adminDashboard.totalServers') || 'Serwery'}
          value={data?.totalServers || 0}
          icon={FaServer}
          color="green"
          trend={data?.trends?.servers?.direction !== 'none' ? data?.trends?.servers?.direction : undefined}
          trendValue={data?.trends?.servers?.value}
        />
        <StatCard
          title={t('adminDashboard.totalLicenses') || 'Licencje'}
          value={data?.totalLicenses || 0}
          icon={FaKey}
          color="purple"
          trend={data?.trends?.licenses?.direction !== 'none' ? data?.trends?.licenses?.direction : undefined}
          trendValue={data?.trends?.licenses?.value}
        />
        <StatCard
          title={t('adminDashboard.commandsToday') || 'Komendy (24h)'}
          value={data?.commandsToday || 0}
          icon={FaTerminal}
          color="yellow"
        />
        <StatCard
          title={t('adminDashboard.activeMutes') || 'Aktywne wyciszenia'}
          value={data?.totalMutes || 0}
          icon={FaShieldAlt}
          color="red"
        />
        <StatCard
          title={t('adminDashboard.newUsers') || 'Nowi uzytkownicy'}
          value={data?.newUsersThisWeek || 0}
          icon={FaUserPlus}
          color="pink"
          subtitle={t('adminDashboard.thisWeek') || 'ten tydzien'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commands per day */}
        <AnimatedCard className="card p-6" delay={0.1}>
          <h2 className="section-title mb-4">{t('adminDashboard.commandsPerDay') || 'Komendy / dzien'}</h2>
          <div className="h-64">
            {data?.charts?.commandsByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.commandsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name={t('adminDashboard.commands') || 'Komendy'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* New users per day */}
        <AnimatedCard className="card p-6" delay={0.15}>
          <h2 className="section-title mb-4">{t('adminDashboard.newUsersPerDay') || 'Nowi uzytkownicy / dzien'}</h2>
          <div className="h-64">
            {data?.charts?.usersByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.usersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name={t('adminDashboard.users') || 'Uzytkownicy'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Server growth */}
        <AnimatedCard className="card p-6" delay={0.2}>
          <h2 className="section-title mb-4">{t('adminDashboard.serverGrowth') || 'Wzrost serwerow'}</h2>
          <div className="h-64">
            {data?.charts?.serversByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.serversByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name={t('adminDashboard.servers') || 'Serwery'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* AutoMod violations */}
        <AnimatedCard className="card p-6" delay={0.25}>
          <h2 className="section-title mb-4">{t('adminDashboard.automodViolations') || 'Naruszenia AutoMod'}</h2>
          <div className="h-64">
            {data?.charts?.automodByType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.automodByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="type" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('adminDashboard.violations') || 'Naruszenia'} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="section-title mb-4">{t('adminDashboard.recentActivity') || 'Ostatnia aktywnosc'}</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data?.recentActivity?.length > 0 ? data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.actionType.includes('BAN') ? 'bg-red-500' :
                  activity.actionType.includes('MUTE') ? 'bg-amber-500' :
                  activity.actionType.includes('WARN') ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    <span className="font-semibold">{activity.actionType}</span>
                    {' '}
                    <span className="text-gray-500 dark:text-gray-400">
                      {activity.guildName}
                    </span>
                  </p>
                  {activity.reason && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{activity.reason}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {new Date(activity.createdAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                {t('adminDashboard.noActivity') || 'Brak aktywnosci'}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="section-title mb-4">{t('adminDashboard.quickActions') || 'Szybkie akcje'}</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors group"
              >
                <action.icon className={`w-5 h-5 ${action.color}`} />
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {action.label}
                </span>
                <FaArrowRight className="w-3 h-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
