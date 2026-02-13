import { useState, useEffect, useCallback } from 'react';
import { moderationService } from '../services/api.service';
import { formatDistanceToNow, format } from 'date-fns';
import { FaGavel, FaSearch, FaFilter, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { PageHeader, SkeletonTable, EmptyState, Pagination, Tooltip } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';

const ACTION_TYPES = ['MUTE', 'UNMUTE', 'WARN', 'CLEAR', 'AUTOMOD_WARN', 'AUTOMOD_MUTE', 'AUTOMOD_KICK', 'AUTOMOD_BAN'];

const ACTION_CONFIG = {
  MUTE:         { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',       label: 'Mute' },
  UNMUTE:       { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', label: 'Unmute' },
  WARN:         { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', label: 'Warn' },
  CLEAR:        { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',    label: 'Clear' },
  AUTOMOD_WARN: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', label: 'AutoMod Warn' },
  AUTOMOD_MUTE: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',       label: 'AutoMod Mute' },
  AUTOMOD_KICK: { color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',   label: 'AutoMod Kick' },
  AUTOMOD_BAN:  { color: 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200',       label: 'AutoMod Ban' },
};

const ITEMS_PER_PAGE = 20;

export default function ModerationLogs() {
  const toast = useToast();
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: ITEMS_PER_PAGE };
      if (actionFilter) params.actionType = actionFilter;
      const response = await moderationService.getLogs(params);
      setLogs(response.data.data || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.total);
      }
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load moderation logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  // Client-side search filtering (search by server name, moderator ID, target ID, reason)
  const filteredLogs = searchDebounced
    ? logs.filter(log =>
        (log.guild?.guildName || '').toLowerCase().includes(searchDebounced.toLowerCase()) ||
        (log.moderatorId || '').includes(searchDebounced) ||
        (log.targetId || '').includes(searchDebounced) ||
        (log.reason || '').toLowerCase().includes(searchDebounced.toLowerCase())
      )
    : logs;

  const getRelativeTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const getFullDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  const activeFiltersCount = (actionFilter ? 1 : 0) + (searchDebounced ? 1 : 0);

  const clearFilters = () => {
    setActionFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.moderationLogs.title') || 'Moderation Logs'}
        subtitle={totalItems > 0 ? `${totalItems} ${t('pages.moderationLogs.totalLogs') || 'total logs'}` : undefined}
        icon={FaGavel}
        iconColor="text-red-500"
      />

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.moderationLogs.searchPlaceholder') || 'Search by server, user ID, reason...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Action Type Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white text-sm appearance-none min-w-[160px]"
            >
              <option value="">{t('pages.moderationLogs.allActions') || 'All Actions'}</option>
              {ACTION_TYPES.map(type => (
                <option key={type} value={type}>{ACTION_CONFIG[type]?.label || type}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <FaTimes className="w-3 h-3" />
              {t('common.clearFilters') || 'Clear'} ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-6">
          <SkeletonTable rows={8} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FaShieldAlt}
            title={searchDebounced || actionFilter
              ? (t('pages.moderationLogs.noResults') || 'No matching logs')
              : (t('pages.moderationLogs.noLogs') || 'No moderation logs')
            }
            description={searchDebounced || actionFilter
              ? (t('pages.moderationLogs.tryDifferentFilter') || 'Try adjusting your filters')
              : (t('pages.moderationLogs.noLogsDescription') || 'Moderation actions will appear here')
            }
            actionLabel={activeFiltersCount > 0 ? (t('common.clearFilters') || 'Clear Filters') : undefined}
            onAction={activeFiltersCount > 0 ? clearFilters : undefined}
          />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.action') || 'Action'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.server') || 'Server'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.moderator') || 'Moderator'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.target') || 'Target'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.reason') || 'Reason'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('pages.moderationLogs.date') || 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${ACTION_CONFIG[log.actionType]?.color || 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'}`}>
                        {ACTION_CONFIG[log.actionType]?.label || log.actionType}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.guild?.guildName || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-600 px-2 py-0.5 rounded">
                        {log.moderatorId}
                      </code>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {log.targetId ? (
                        <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-600 px-2 py-0.5 rounded">
                          {log.targetId}
                        </code>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-[250px]">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={log.reason || undefined}>
                        {log.reason || <span className="italic text-gray-400 dark:text-gray-500">{t('pages.moderationLogs.noReason') || 'No reason'}</span>}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div title={getFullDate(log.created_at)}>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {getRelativeTime(log.created_at)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {getFullDate(log.created_at)}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredLogs.map((log) => (
              <div key={log.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${ACTION_CONFIG[log.actionType]?.color || 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'}`}>
                    {ACTION_CONFIG[log.actionType]?.label || log.actionType}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400" title={getFullDate(log.created_at)}>
                    {getRelativeTime(log.created_at)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{t('pages.moderationLogs.server') || 'Server'}</p>
                    <p className="text-gray-900 dark:text-white font-medium truncate">{log.guild?.guildName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{t('pages.moderationLogs.moderator') || 'Moderator'}</p>
                    <p className="text-gray-600 dark:text-gray-400 font-mono text-xs truncate">{log.moderatorId}</p>
                  </div>
                </div>

                {log.targetId && (
                  <div className="text-sm">
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{t('pages.moderationLogs.target') || 'Target'}</p>
                    <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">{log.targetId}</p>
                  </div>
                )}

                {log.reason && (
                  <div className="text-sm">
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{t('pages.moderationLogs.reason') || 'Reason'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{log.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
