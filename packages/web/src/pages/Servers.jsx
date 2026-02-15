import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardService } from '../services/api.service';
import {
  FaServer, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaCrown, FaGem,
  FaChevronRight, FaPlus, FaSearch, FaSortAmountDown, FaSortAmountUp, FaTh, FaList, FaUsers
} from 'react-icons/fa';
import { EmptyState, SkeletonCard } from '../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';

const FILTERS = ['all', 'active', 'botOnly', 'noBot'];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

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
    } catch {
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
    if (filter === 'active') result = activeGuilds;
    else if (filter === 'botOnly') result = botOnlyGuilds;
    else if (filter === 'noBot') result = noBotGuilds;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.name?.toLowerCase().includes(q) || g.id?.includes(q));
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return sortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'members') {
        return sortAsc ? (a.memberCount || 0) - (b.memberCount || 0) : (b.memberCount || 0) - (a.memberCount || 0);
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
      iconColor: 'text-green-400',
      glow: 'hover:ring-green-500/20',
    },
    botOnly: {
      icon: FaExclamationTriangle,
      iconColor: 'text-amber-400',
      glow: 'hover:ring-amber-500/20',
    },
    noBot: {
      icon: FaTimesCircle,
      iconColor: 'text-gray-500',
      glow: 'hover:ring-primary-500/20',
    },
  };

  const renderGuildCard = (guild) => {
    const status = getGuildStatus(guild);
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const canManage = status === 'active' || status === 'botOnly';
    const canInvite = status === 'noBot';

    return (
      <motion.div key={guild.id} variants={fadeUp}>
        <GlassCard
          hover={canManage || canInvite}
          className={cn(
            'p-4 md:p-5 group',
            canManage && 'cursor-pointer',
            !canManage && !canInvite && 'opacity-50',
            config.glow
          )}
          onClick={() => canManage && navigate(`/servers/${guild.id}`)}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {guild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                  alt={guild.name}
                  className="w-14 h-14 rounded-xl object-cover shadow-sm"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-400">{guild.name?.charAt(0)}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-dark-950 border border-white/10">
                <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{guild.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <FaUsers className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {guild.memberCount?.toLocaleString() || '?'} {t('common.members')}
                </span>
              </div>
              {guild.license && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  {t('pages.servers.expires')}: {guild.license.expiresAt
                    ? new Date(guild.license.expiresAt).toLocaleDateString()
                    : t('pages.servers.never') || 'Never'
                  }
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {guild.license && (
                <span className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                  guild.license.tier === 'VIP'
                    ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20'
                    : guild.license.tier === 'PREMIUM'
                      ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20'
                      : 'bg-white/5 text-gray-400 ring-1 ring-white/10'
                )}>
                  {guild.license.tier === 'VIP' ? <FaCrown className="w-3 h-3" /> : guild.license.tier === 'PREMIUM' ? <FaGem className="w-3 h-3" /> : null}
                  {guild.license.tier}
                </span>
              )}
              {canManage && (
                <FaChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
              )}
              {canInvite && (
                <a
                  href={getInviteUrl(guild.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="btn-primary btn-sm"
                >
                  <FaPlus className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('pages.servers.inviteBot')}</span>
                </a>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
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
        className={cn(
          'flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 transition-colors',
          canManage ? 'cursor-pointer hover:bg-white/5' : canInvite ? '' : 'opacity-50'
        )}
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
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-500">{guild.name?.charAt(0)}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-dark-950">
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
          <span className={cn(
            'hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold',
            guild.license.tier === 'VIP'
              ? 'bg-purple-500/15 text-purple-300'
              : 'bg-cyan-500/15 text-cyan-300'
          )}>
            {guild.license.tier}
          </span>
        )}

        {canManage && <FaChevronRight className="w-3.5 h-3.5 text-gray-600" />}
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
          <div className="w-40 h-8 bg-white/5 rounded animate-pulse" />
          <div className="w-28 h-5 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/20">
            <FaServer className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pages.servers.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('pages.servers.subtitle')}</p>
          </div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {guilds.length} {t('pages.servers.servers')}
        </span>
      </div>

      {/* Search + Sort + View Toggle */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.servers.searchPlaceholder') || 'Search servers...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort('name')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                sortBy === 'name'
                  ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {sortBy === 'name' && (sortAsc ? <FaSortAmountUp className="w-3 h-3" /> : <FaSortAmountDown className="w-3 h-3" />)}
              {t('pages.servers.sortName') || 'Name'}
            </button>
            <button
              onClick={() => toggleSort('members')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                sortBy === 'members'
                  ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {sortBy === 'members' && (sortAsc ? <FaSortAmountUp className="w-3 h-3" /> : <FaSortAmountDown className="w-3 h-3" />)}
              {t('pages.servers.sortMembers') || 'Members'}
            </button>

            <div className="hidden sm:flex items-center border border-white/10 rounded-xl overflow-hidden ml-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:text-gray-300')}
              >
                <FaTh className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:text-gray-300')}
              >
                <FaList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                filter === f
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {filterLabels[f]}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-bold',
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-500'
              )}>
                {filterCounts[f]}
              </span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Results */}
      {filteredGuilds.length === 0 ? (
        <GlassCard>
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
        </GlassCard>
      ) : viewMode === 'list' ? (
        <GlassCard className="overflow-hidden">
          {filteredGuilds.map(renderGuildListRow)}
        </GlassCard>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {filteredGuilds.map(renderGuildCard)}
        </motion.div>
      )}
    </div>
  );
}
