import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api.service';
import {
  FaServer, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaCrown, FaGem,
  FaChevronRight, FaPlus, FaSearch, FaSortAmountDown, FaSortAmountUp, FaTh, FaList
} from 'react-icons/fa';
import { AnimatedList, AnimatedListItem } from '../components/animated';
import { EmptyState, PageHeader, SkeletonCard } from '../components/ui';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const FILTERS = ['all', 'active', 'botOnly', 'noBot'];

export default function Servers() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      const response = await dashboardService.getUserGuilds();
      setGuilds(response.data.data);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const activeGuilds = useMemo(() => guilds.filter(g => g.registered && g.isActive && g.license), [guilds]);
  const botOnlyGuilds = useMemo(() => guilds.filter(g => g.registered && (!g.license || !g.isActive)), [guilds]);
  const noBotGuilds = useMemo(() => guilds.filter(g => !g.registered), [guilds]);

  const filterCounts = useMemo(() => ({
    all: guilds.length,
    active: activeGuilds.length,
    botOnly: botOnlyGuilds.length,
    noBot: noBotGuilds.length,
  }), [guilds, activeGuilds, botOnlyGuilds, noBotGuilds]);

  const filterLabels = {
    all: t('pages.servers.filterAll') || 'All',
    active: t('pages.servers.activeServers') || 'Active',
    botOnly: t('pages.servers.botWithoutLicense') || 'No License',
    noBot: t('pages.servers.withoutBot') || 'No Bot',
  };

  const getGuildStatus = (guild) => {
    if (guild.registered && guild.isActive && guild.license) return 'active';
    if (guild.registered) return 'botOnly';
    return 'noBot';
  };

  const filteredGuilds = useMemo(() => {
    let result = guilds;

    // Filter by tab
    if (filter === 'active') result = activeGuilds;
    else if (filter === 'botOnly') result = botOnlyGuilds;
    else if (filter === 'noBot') result = noBotGuilds;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.name?.toLowerCase().includes(q) || g.id?.includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return sortAsc
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'members') {
        return sortAsc
          ? (a.memberCount || 0) - (b.memberCount || 0)
          : (b.memberCount || 0) - (a.memberCount || 0);
      }
      return 0;
    });

    return result;
  }, [guilds, activeGuilds, botOnlyGuilds, noBotGuilds, filter, search, sortBy, sortAsc]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
  };

  const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1237706962158878752&permissions=8&scope=bot%20applications.commands';
  const getInviteUrl = (guildId) => `${INVITE_URL}&guild_id=${guildId}`;

  const statusConfig = {
    active: {
      icon: FaCheckCircle,
      iconColor: 'text-green-500',
      bgHover: 'hover:border-green-300 dark:hover:border-green-700',
    },
    botOnly: {
      icon: FaExclamationTriangle,
      iconColor: 'text-amber-500',
      bgHover: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    noBot: {
      icon: FaTimesCircle,
      iconColor: 'text-gray-400 dark:text-gray-500',
      bgHover: 'hover:border-primary-300 dark:hover:border-primary-700',
    },
  };

  const renderGuildCard = (guild) => {
    const status = getGuildStatus(guild);
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const canManage = status === 'active' || status === 'botOnly';
    const canInvite = status === 'noBot';

    return (
      <div
        key={guild.id}
        onClick={() => canManage && navigate(`/servers/${guild.id}`)}
        className={`
          card p-4 md:p-5 transition-all duration-200 group hover:translate-y-[-2px]
          ${canManage
            ? `cursor-pointer ${config.bgHover} hover:shadow-soft-lg dark:hover:shadow-dark-lg`
            : canInvite
              ? `${config.bgHover} hover:shadow-soft-lg dark:hover:shadow-dark-lg`
              : 'opacity-60 cursor-not-allowed'
          }
        `}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-200 dark:bg-dark-700 flex items-center justify-center shadow-sm">
                <FaServer className="text-gray-400 dark:text-gray-500 text-xl" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-dark-800 shadow-sm">
              <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{guild.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {guild.memberCount?.toLocaleString() || '?'} {t('common.members')}
            </p>
            {guild.license && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t('pages.servers.expires')}: {guild.license.expiresAt
                  ? new Date(guild.license.expiresAt).toLocaleDateString()
                  : t('pages.servers.never')
                }
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {guild.license && (
              <span className={`
                hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                ${guild.license.tier === 'VIP'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : guild.license.tier === 'PREMIUM'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
                }
              `}>
                {guild.license.tier === 'VIP' ? <FaCrown className="w-3 h-3" /> : guild.license.tier === 'PREMIUM' ? <FaGem className="w-3 h-3" /> : null}
                {guild.license.tier}
              </span>
            )}
            {canManage && (
              <FaChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
            )}
            {canInvite && (
              <a
                href={getInviteUrl(guild.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-sm hover:shadow-md"
              >
                <FaPlus className="w-3 h-3" />
                <span className="hidden sm:inline">{t('pages.servers.inviteBot')}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGuildListRow = (guild) => {
    const status = getGuildStatus(guild);
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const canManage = status === 'active' || status === 'botOnly';
    const canInvite = status === 'noBot';

    return (
      <div
        key={guild.id}
        onClick={() => canManage && navigate(`/servers/${guild.id}`)}
        className={`
          flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-dark-700 last:border-b-0 transition-colors
          ${canManage ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700/50' : canInvite ? '' : 'opacity-60'}
        `}
      >
        <div className="relative flex-shrink-0">
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt={guild.name}
              className="w-10 h-10 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-700 flex items-center justify-center">
              <FaServer className="text-gray-400 text-sm" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-white dark:bg-dark-800">
            <StatusIcon className={`w-2.5 h-2.5 ${config.iconColor}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{guild.name}</h3>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          {guild.memberCount?.toLocaleString() || '?'} {t('common.members')}
        </span>

        {guild.license && (
          <span className={`
            hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold
            ${guild.license.tier === 'VIP'
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            }
          `}>
            {guild.license.tier}
          </span>
        )}

        {canManage && <FaChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
        {canInvite && (
          <a
            href={getInviteUrl(guild.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn-primary btn-sm"
          >
            <FaPlus className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-40 h-8 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
          <div className="w-28 h-5 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.servers.title')}
        subtitle={t('pages.servers.subtitle')}
        icon={FaServer}
        iconColor="text-blue-500"
        actions={
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {guilds.length} {t('pages.servers.servers')}
          </span>
        }
      />

      {/* Search + Sort + View Toggle */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.servers.searchPlaceholder') || 'Search servers...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              {sortBy === 'name' && (sortAsc ? <FaSortAmountUp className="w-3 h-3" /> : <FaSortAmountDown className="w-3 h-3" />)}
              {t('pages.servers.sortName') || 'Name'}
            </button>
            <button
              onClick={() => toggleSort('members')}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sortBy === 'members'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              {sortBy === 'members' && (sortAsc ? <FaSortAmountUp className="w-3 h-3" /> : <FaSortAmountDown className="w-3 h-3" />)}
              {t('pages.servers.sortMembers') || 'Members'}
            </button>

            {/* View toggle */}
            <div className="hidden sm:flex items-center border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden ml-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FaTh className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FaList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-700 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              {filterLabels[f]}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-400'
              }`}>
                {filterCounts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredGuilds.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FaServer}
            title={search
              ? (t('pages.servers.noSearchResults') || 'No servers found')
              : (t('pages.servers.noServers') || 'No servers')
            }
            description={search
              ? (t('pages.servers.tryDifferentSearch') || 'Try a different search term')
              : (t('pages.servers.noServersDescription') || 'No servers match this filter')
            }
            actionLabel={search ? (t('common.clearSearch') || 'Clear search') : undefined}
            onAction={search ? () => setSearch('') : undefined}
          />
        </div>
      ) : viewMode === 'list' ? (
        <div className="card overflow-hidden">
          {filteredGuilds.map(renderGuildListRow)}
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGuilds.map((guild) => (
            <AnimatedListItem key={guild.id}>
              {renderGuildCard(guild)}
            </AnimatedListItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
