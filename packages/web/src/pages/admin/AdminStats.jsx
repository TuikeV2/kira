import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTerminal, FaShieldAlt, FaGavel, FaCheckCircle, FaTimesCircle,
  FaChartLine, FaChartPie
} from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import StatCard from '../../components/StatCard';
import { AnimatedCard } from '../../components/animated';
import { SkeletonStats, SkeletonTable } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--tooltip-bg, #1f2937)',
  border: 'none',
  borderRadius: '8px',
  color: 'var(--tooltip-text, #fff)'
};

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminStats() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState('commands');
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period };
      let response;
      if (tab === 'commands') {
        response = await adminService.getCommandAnalytics(params);
      } else if (tab === 'automod') {
        response = await adminService.getAutomodAnalytics(params);
      } else {
        response = await adminService.getModerationAnalytics(params);
      }
      setData(response.data.data);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [tab, period, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { id: 'commands', label: t('adminStats.commands') || 'Komendy', icon: FaTerminal },
    { id: 'automod', label: t('adminStats.automod') || 'AutoMod', icon: FaShieldAlt },
    { id: 'moderation', label: t('adminStats.moderation') || 'Moderacja', icon: FaGavel }
  ];

  const periods = [
    { value: 7, label: t('adminStats.days7') || '7 dni' },
    { value: 30, label: t('adminStats.days30') || '30 dni' },
    { value: 'all', label: t('adminStats.all') || 'Wszystko' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">{t('adminStats.title') || 'Statystyki bota'}</h1>
        <p className="page-subtitle">{t('adminStats.subtitle') || 'Analityka komend, automod i moderacji'}</p>
      </div>

      {/* Tabs + Period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setData(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-6">
          <SkeletonStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6"><SkeletonTable rows={5} /></div>
            <div className="card p-6"><SkeletonTable rows={5} /></div>
          </div>
        </div>
      ) : (
        <>
          {/* Commands Tab */}
          {tab === 'commands' && data && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title={t('adminStats.totalCommands') || 'Razem komend'}
                  value={data.totalCommands || 0}
                  icon={FaTerminal}
                  color="blue"
                />
                <StatCard
                  title={t('adminStats.successRate') || 'Wskaznik sukcesu'}
                  value={`${data.successRate || 0}%`}
                  icon={FaCheckCircle}
                  color="green"
                />
                <StatCard
                  title={t('adminStats.uniqueCommands') || 'Unikalne komendy'}
                  value={data.topCommands?.length || 0}
                  icon={FaChartLine}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Commands per day chart */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.commandsPerDay') || 'Komendy / dzien'}</h2>
                  <div className="h-64">
                    {data.commandsPerDay?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.commandsPerDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name={t('adminStats.commands') || 'Komendy'} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>

                {/* Top Commands table */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.topCommands') || 'Top komendy'}</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.topCommands?.length > 0 ? data.topCommands.map((cmd, i) => (
                      <div key={cmd.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-mono text-gray-700 dark:text-gray-200">/{cmd.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{cmd.count}</span>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>
              </div>

              {/* Active Servers + Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.activeServers') || 'Aktywne serwery'}</h2>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.activeServers?.length > 0 ? data.activeServers.map((s, i) => (
                      <div key={s.guildId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{s.guildId}</span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{s.count}</span>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>

                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.activeUsers') || 'Aktywni uzytkownicy'}</h2>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.activeUsers?.length > 0 ? data.activeUsers.map((u) => (
                      <div key={u.userId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{u.userId}</span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{u.count}</span>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>
              </div>
            </div>
          )}

          {/* AutoMod Tab */}
          {tab === 'automod' && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Violations PieChart */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.violationsByType') || 'Naruszenia wg typu'}</h2>
                  <div className="h-72">
                    {data.violationsByType?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.violationsByType.map(v => ({ name: v.type, value: v.count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {data.violationsByType.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Brak naruszen</div>
                    )}
                  </div>
                </AnimatedCard>

                {/* Recent Violations table */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.recentViolations') || 'Ostatnie naruszenia'}</h2>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    {data.recentViolations?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-dark-700">
                            <th className="text-left py-2 text-xs text-gray-500 dark:text-gray-400">{t('adminStats.type') || 'Typ'}</th>
                            <th className="text-left py-2 text-xs text-gray-500 dark:text-gray-400">{t('adminStats.action') || 'Akcja'}</th>
                            <th className="text-left py-2 text-xs text-gray-500 dark:text-gray-400">{t('adminStats.guild') || 'Serwer'}</th>
                            <th className="text-left py-2 text-xs text-gray-500 dark:text-gray-400">{t('adminStats.date') || 'Data'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentViolations.slice(0, 15).map((v) => (
                            <tr key={v.id} className="border-b border-gray-100 dark:border-dark-700/50">
                              <td className="py-2">
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">{v.violationType}</span>
                              </td>
                              <td className="py-2">
                                <span className="text-xs text-gray-600 dark:text-gray-300">{v.actionTaken}</span>
                              </td>
                              <td className="py-2">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{v.guildId}</span>
                              </td>
                              <td className="py-2 text-xs text-gray-400">
                                {new Date(v.createdAt).toLocaleDateString('pl-PL')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-gray-400">Brak naruszen</div>
                    )}
                  </div>
                </AnimatedCard>
              </div>
            </div>
          )}

          {/* Moderation Tab */}
          {tab === 'moderation' && data && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title={t('adminStats.warningsIssued') || 'Ostrzezenia'}
                  value={data.warningsCount || 0}
                  icon={FaGavel}
                  color="yellow"
                  subtitle={`${data.activeWarnings || 0} ${t('adminStats.active') || 'aktywnych'}`}
                />
                <StatCard
                  title={t('adminStats.mutesIssued') || 'Wyciszenia'}
                  value={data.mutesCount || 0}
                  icon={FaTimesCircle}
                  color="red"
                  subtitle={`${data.activeMutes || 0} ${t('adminStats.active') || 'aktywnych'}`}
                />
                <StatCard
                  title={t('adminStats.totalActions') || 'Razem akcji'}
                  value={data.actionsByType?.reduce((sum, a) => sum + a.count, 0) || 0}
                  icon={FaShieldAlt}
                  color="blue"
                />
                <StatCard
                  title={t('adminStats.activeModerators') || 'Aktywni moderatorzy'}
                  value={data.topModerators?.length || 0}
                  icon={FaChartPie}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Actions by type BarChart */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.actionsByType') || 'Akcje wg typu'}</h2>
                  <div className="h-64">
                    {data.actionsByType?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.actionsByType}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis dataKey="type" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('adminStats.count') || 'Ilosc'} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>

                {/* Top Moderators table */}
                <AnimatedCard className="card p-6">
                  <h2 className="section-title mb-4">{t('adminStats.topModerators') || 'Top moderatorzy'}</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.topModerators?.length > 0 ? data.topModerators.map((m, i) => (
                      <div key={m.moderatorId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-mono text-gray-700 dark:text-gray-200">{m.moderatorId}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{m.count} {t('adminStats.actions') || 'akcji'}</span>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-400">Brak danych</div>
                    )}
                  </div>
                </AnimatedCard>
              </div>

              {/* Per-server moderation */}
              <AnimatedCard className="card p-6">
                <h2 className="section-title mb-4">{t('adminStats.perServer') || 'Moderacja na serwer'}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.perServer?.length > 0 ? data.perServer.map((s) => (
                    <div key={s.guildId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">{s.guildId}</span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-2">{s.count}</span>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-4 text-gray-400">Brak danych</div>
                  )}
                </div>
              </AnimatedCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
