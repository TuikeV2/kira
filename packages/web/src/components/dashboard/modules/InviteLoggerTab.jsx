import { useState, useEffect } from 'react';
import { FaUserPlus, FaSave, FaHashtag, FaTrophy, FaUsers, FaLink, FaQuestionCircle, FaClock } from 'react-icons/fa';
import { dashboardService, moderationService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function InviteLoggerTab({ guildId, channels, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    inviteLoggingEnabled: false,
    inviteLogChannelId: ''
  });
  const [stats, setStats] = useState(null);
  const [inviteLogs, setInviteLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        ...prev,
        inviteLoggingEnabled: initialSettings.inviteLoggingEnabled || false,
        inviteLogChannelId: initialSettings.inviteLogChannelId || ''
      }));
    }
  }, [initialSettings]);

  useEffect(() => {
    fetchData();
  }, [guildId, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.allSettled([
        moderationService.getInviteStats(guildId),
        moderationService.getInviteLogs(guildId, { page, limit: 10 })
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      } else {
        setStats({ totalJoins: 0, recentJoins: 0, joinTypes: {}, topInviters: [] });
      }

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value?.data?.data)) {
        setInviteLogs(logsRes.value.data.data);
        setTotalPages(logsRes.value.data.pagination?.totalPages || 1);
      } else {
        setInviteLogs([]);
        setTotalPages(1);
      }
    } catch (error) {
      setStats({ totalJoins: 0, recentJoins: 0, joinTypes: {}, topInviters: [] });
      setInviteLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dashboardService.updateGuildSettings(guildId, settings);
      setMessage({ type: 'success', text: t('dashboard.settingsSaved') });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: t('dashboard.settingsSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getJoinTypeBadge = (joinType) => {
    switch (joinType) {
      case 'INVITE':
        return <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Zaproszenie</span>;
      case 'VANITY':
        return <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Vanity URL</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Nieznane</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FaUserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite Logger</h2>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, inviteLoggingEnabled: !settings.inviteLoggingEnabled })}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
              ${settings.inviteLoggingEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'}
            `}
            role="switch"
            aria-checked={settings.inviteLoggingEnabled}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow-md
                transition-transform duration-200
                ${settings.inviteLoggingEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {settings.inviteLoggingEnabled && (
          <form onSubmit={handleSaveSettings} className="space-y-4 animate-fade-in">
            <div>
              <label className="label">
                <FaHashtag className="inline w-3 h-3 mr-1" />
                Kanal Logow
              </label>
              <select
                value={settings.inviteLogChannelId}
                onChange={e => setSettings({ ...settings, inviteLogChannelId: e.target.value })}
                className="select"
              >
                <option value="">Wybierz kanal...</option>
                {Array.isArray(channels) && channels.filter(c => c.type === 0).map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Logi dolaczen beda wysylane na ten kanal
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Zapisywanie...
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4" />
                  Zapisz Ustawienia
                </>
              )}
            </button>
          </form>
        )}

        {!settings.inviteLoggingEnabled && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Wlacz invite logger aby sledzic kto zaprasza uzytkownikow na serwer.
          </p>
        )}
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <FaUsers className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalJoins}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lacznie dolaczen</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <FaClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentJoins}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ostatnie 7 dni</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <FaLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.joinTypes?.INVITE || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Przez zaproszenie</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <FaQuestionCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.joinTypes?.UNKNOWN || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Nieznane</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Inviters */}
      {stats?.topInviters?.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <FaTrophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Zapraszajacy</h3>
          </div>
          <div className="space-y-2">
            {stats.topInviters.map((inviter, index) => (
              <div key={inviter.inviterId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-amber-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">{inviter.inviterTag || 'Nieznany'}</span>
                </div>
                <span className="text-primary-600 dark:text-primary-400 font-bold">{inviter.inviteCount} zaproszen</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Joins */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <FaUserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ostatnie Dolaczenia</h3>
          </div>
          <button
            onClick={fetchData}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Odswiez
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : inviteLogs.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Brak zapisanych dolaczen
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-dark-600">
                    <th className="pb-3 font-medium">Uzytkownik</th>
                    <th className="pb-3 font-medium">Zaproszony przez</th>
                    <th className="pb-3 font-medium">Typ</th>
                    <th className="pb-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {inviteLogs.map((log) => (
                    <tr key={log.id} className="text-sm">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{log.memberTag}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.memberId}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        {log.inviterTag ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.inviterTag}</p>
                            {log.inviteCode && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Kod: {log.inviteCode}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        {getJoinTypeBadge(log.joinType)}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        {formatDate(log.joined_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-dark-700 disabled:opacity-50"
                >
                  Poprzednia
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-dark-700 disabled:opacity-50"
                >
                  Nastepna
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
