import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaUsers, FaServer, FaKey, FaTerminal, FaShieldAlt, FaUserPlus,
  FaArrowRight, FaBox, FaChartBar
} from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { GlassStatCard } from '../../components/ui/GlassStatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { SkeletonCard } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
    } catch {
      toast.error(t('common.fetchError') || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-48 h-8 bg-white/5 rounded-xl animate-pulse" />
          <div className="w-32 h-5 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: t('adminDashboard.users') || 'Users', path: '/admin/users', icon: FaUsers, color: 'blue' },
    { label: t('adminDashboard.servers') || 'Servers', path: '/admin/servers', icon: FaServer, color: 'green' },
    { label: t('adminDashboard.products') || 'Products', path: '/admin/products', icon: FaBox, color: 'purple' },
    { label: t('adminDashboard.statistics') || 'Statistics', path: '/admin/stats', icon: FaChartBar, color: 'yellow' },
  ];

  const actionColors = {
    blue: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',
    green: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/20',
    purple: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20',
  };

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-white">{t('adminDashboard.title') || 'Admin Panel'}</h1>
        <p className="text-gray-400 mt-1">{t('adminDashboard.subtitle') || 'System overview'}</p>
      </motion.div>

      {/* Stats Grid - 6 cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <GlassStatCard
          title={t('adminDashboard.totalUsers') || 'Users'}
          value={data?.totalUsers || 0}
          icon={FaUsers}
          color="blue"
          trend={data?.trends?.users?.direction !== 'none' ? data?.trends?.users?.direction : undefined}
          trendValue={data?.trends?.users?.value}
        />
        <GlassStatCard
          title={t('adminDashboard.totalServers') || 'Servers'}
          value={data?.totalServers || 0}
          icon={FaServer}
          color="green"
          trend={data?.trends?.servers?.direction !== 'none' ? data?.trends?.servers?.direction : undefined}
          trendValue={data?.trends?.servers?.value}
        />
        <GlassStatCard
          title={t('adminDashboard.totalLicenses') || 'Licenses'}
          value={data?.totalLicenses || 0}
          icon={FaKey}
          color="purple"
          trend={data?.trends?.licenses?.direction !== 'none' ? data?.trends?.licenses?.direction : undefined}
          trendValue={data?.trends?.licenses?.value}
        />
        <GlassStatCard
          title={t('adminDashboard.commandsToday') || 'Commands (24h)'}
          value={data?.commandsToday || 0}
          icon={FaTerminal}
          color="yellow"
        />
        <GlassStatCard
          title={t('adminDashboard.activeMutes') || 'Active mutes'}
          value={data?.totalMutes || 0}
          icon={FaShieldAlt}
          color="red"
        />
        <GlassStatCard
          title={t('adminDashboard.newUsers') || 'New users'}
          value={data?.newUsersThisWeek || 0}
          icon={FaUserPlus}
          color="pink"
          subtitle={t('adminDashboard.thisWeek') || 'this week'}
        />
      </motion.div>

      {/* Charts */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commands per day */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.commandsPerDay') || 'Commands / day'}</h2>
          <div className="h-64">
            {data?.charts?.commandsByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.commandsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} name={t('adminDashboard.commands') || 'Commands'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </GlassCard>

        {/* New users per day */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.newUsersPerDay') || 'New users / day'}</h2>
          <div className="h-64">
            {data?.charts?.usersByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.usersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name={t('adminDashboard.users') || 'Users'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Server growth */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.serverGrowth') || 'Server growth'}</h2>
          <div className="h-64">
            {data?.charts?.serversByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.serversByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} name={t('adminDashboard.servers') || 'Servers'} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </GlassCard>

        {/* AutoMod violations */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.automodViolations') || 'AutoMod violations'}</h2>
          <div className="h-64">
            {data?.charts?.automodByType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.automodByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="type" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} name={t('adminDashboard.violations') || 'Violations'} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('pages.adminDashboard.noDataToShow')}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Activity Feed + Quick Actions */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <GlassCard className="lg:col-span-2 p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.recentActivity') || 'Recent activity'}</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {data?.recentActivity?.length > 0 ? data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  activity.actionType.includes('BAN') ? 'bg-red-500' :
                  activity.actionType.includes('MUTE') ? 'bg-amber-500' :
                  activity.actionType.includes('WARN') ? 'bg-yellow-500' :
                  'bg-blue-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    <span className="font-semibold">{activity.actionType}</span>
                    {' '}
                    <span className="text-gray-500">{activity.guildName}</span>
                  </p>
                  {activity.reason && (
                    <p className="text-xs text-gray-500 truncate">{activity.reason}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(activity.createdAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                {t('adminDashboard.noActivity') || 'No activity'}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">{t('adminDashboard.quickActions') || 'Quick actions'}</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', actionColors[action.color])}>
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-200">
                  {action.label}
                </span>
                <FaArrowRight className="w-3 h-3 text-gray-500 group-hover:text-primary-400 transition-colors" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
