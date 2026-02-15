import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardService } from '../services/api.service';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { GlassCard } from '../components/ui/GlassCard';
import { cn } from '../lib/utils';
import {
  FaServer,
  FaArrowLeft,
  FaHandSparkles,
  FaRobot,
  FaShieldAlt,
  FaPaperPlane,
  FaTicketAlt,
  FaTerminal,
  FaGift,
  FaTrophy,
  FaChartBar,
  FaUserPlus,
  FaHashtag,
  FaUsers,
  FaCrown,
  FaCog,
  FaClipboardList,
  FaMicrophone,
  FaMusic,
  FaChevronDown,
  FaChevronRight
} from 'react-icons/fa';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const MODULE_CARDS = [
  {
    id: 'overview',
    labelKey: 'dashboard.overview',
    descKey: 'dashboard.overviewDesc',
    icon: FaServer,
    color: 'blue',
    category: 'main',
    alwaysOn: true,
  },
  {
    id: 'bot-customization',
    labelKey: 'dashboard.botCustomization',
    descKey: 'dashboard.botCustomizationDesc',
    icon: FaRobot,
    color: 'purple',
    category: 'main',
    alwaysOn: true,
  },
  {
    id: 'channel-management',
    labelKey: 'channelManagement.title',
    descKey: 'channelManagement.subtitle',
    icon: FaHashtag,
    color: 'gray',
    category: 'management',
    alwaysOn: true,
  },
  {
    id: 'role-management',
    labelKey: 'roleManagement.title',
    descKey: 'roleManagement.description',
    icon: FaCrown,
    color: 'amber',
    category: 'management',
    alwaysOn: true,
  },
  {
    id: 'automod',
    labelKey: 'dashboard.automod',
    descKey: 'dashboard.automodDesc',
    icon: FaShieldAlt,
    color: 'red',
    category: 'management',
    settingsKey: 'automodEnabled',
  },
  {
    id: 'join-leave',
    labelKey: 'dashboard.joinLeave',
    descKey: 'dashboard.joinLeaveDesc',
    icon: FaHandSparkles,
    color: 'green',
    category: 'engagement',
    settingsKey: 'welcomeEnabled',
  },
  {
    id: 'invite-logger',
    labelKey: 'dashboard.inviteLogger',
    descKey: 'dashboard.inviteLoggerDesc',
    icon: FaUserPlus,
    color: 'cyan',
    category: 'engagement',
    settingsKey: 'inviteLoggingEnabled',
  },
  {
    id: 'leveling',
    labelKey: 'dashboard.leveling',
    descKey: 'dashboard.levelingDesc',
    icon: FaTrophy,
    color: 'yellow',
    category: 'engagement',
    settingsKey: 'levelingEnabled',
  },
  {
    id: 'giveaways',
    labelKey: 'dashboard.giveaways',
    descKey: 'dashboard.giveawaysDesc',
    icon: FaGift,
    color: 'pink',
    category: 'engagement',
    settingsKey: 'giveawaysEnabled',
  },
  {
    id: 'music',
    labelKey: 'dashboard.music',
    descKey: 'dashboard.musicDesc',
    icon: FaMusic,
    color: 'rose',
    category: 'engagement',
    settingsKey: 'musicEnabled',
  },
  {
    id: 'embed-creator',
    labelKey: 'dashboard.embedCreator',
    descKey: 'dashboard.embedCreatorDesc',
    icon: FaPaperPlane,
    color: 'indigo',
    category: 'utilities',
    settingsKey: 'embedCreatorEnabled',
  },
  {
    id: 'reaction-roles',
    labelKey: 'dashboard.reactionRoles',
    descKey: 'dashboard.reactionRolesDesc',
    icon: FaClipboardList,
    color: 'orange',
    category: 'utilities',
    settingsKey: 'reactionRolesEnabled',
  },
  {
    id: 'tickets',
    labelKey: 'dashboard.tickets',
    descKey: 'dashboard.ticketsDesc',
    icon: FaTicketAlt,
    color: 'emerald',
    category: 'utilities',
    settingsKey: 'ticketsEnabled',
  },
  {
    id: 'custom-commands',
    labelKey: 'dashboard.customCommands',
    descKey: 'dashboard.customCommandsDesc',
    icon: FaTerminal,
    color: 'violet',
    category: 'utilities',
    settingsKey: 'customCommandsEnabled',
  },
  {
    id: 'stats-channels',
    labelKey: 'dashboard.statsChannels',
    descKey: 'dashboard.statsChannelsDesc',
    icon: FaChartBar,
    color: 'teal',
    category: 'utilities',
    settingsKey: 'statsChannelsEnabled',
  },
  {
    id: 'temp-voice',
    labelKey: 'dashboard.tempVoice',
    descKey: 'dashboard.tempVoiceDesc',
    icon: FaMicrophone,
    color: 'fuchsia',
    category: 'utilities',
    settingsKey: 'tempVoiceEnabled',
  },
];

const CATEGORIES = [
  { id: 'main', labelKey: 'dashboard.categoryCore', fallback: 'Core' },
  { id: 'management', labelKey: 'dashboard.categoryManagement', fallback: 'Management' },
  { id: 'engagement', labelKey: 'dashboard.categoryEngagement', fallback: 'Engagement' },
  { id: 'utilities', labelKey: 'dashboard.categoryUtilities', fallback: 'Utilities' },
];

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/15',    text: 'text-blue-400',    ring: 'ring-blue-500/20',    glow: 'shadow-blue-500/10' },
  purple:  { bg: 'bg-purple-500/15',  text: 'text-purple-400',  ring: 'ring-purple-500/20',  glow: 'shadow-purple-500/10' },
  gray:    { bg: 'bg-gray-500/15',    text: 'text-gray-400',    ring: 'ring-gray-500/20',    glow: 'shadow-gray-500/10' },
  amber:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/20',   glow: 'shadow-amber-500/10' },
  red:     { bg: 'bg-red-500/15',     text: 'text-red-400',     ring: 'ring-red-500/20',     glow: 'shadow-red-500/10' },
  green:   { bg: 'bg-green-500/15',   text: 'text-green-400',   ring: 'ring-green-500/20',   glow: 'shadow-green-500/10' },
  cyan:    { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    ring: 'ring-cyan-500/20',    glow: 'shadow-cyan-500/10' },
  yellow:  { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  ring: 'ring-yellow-500/20',  glow: 'shadow-yellow-500/10' },
  pink:    { bg: 'bg-pink-500/15',    text: 'text-pink-400',    ring: 'ring-pink-500/20',    glow: 'shadow-pink-500/10' },
  rose:    { bg: 'bg-rose-500/15',    text: 'text-rose-400',    ring: 'ring-rose-500/20',    glow: 'shadow-rose-500/10' },
  indigo:  { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  ring: 'ring-indigo-500/20',  glow: 'shadow-indigo-500/10' },
  orange:  { bg: 'bg-orange-500/15',  text: 'text-orange-400',  ring: 'ring-orange-500/20',  glow: 'shadow-orange-500/10' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/20', glow: 'shadow-emerald-500/10' },
  violet:  { bg: 'bg-violet-500/15',  text: 'text-violet-400',  ring: 'ring-violet-500/20',  glow: 'shadow-violet-500/10' },
  teal:    { bg: 'bg-teal-500/15',    text: 'text-teal-400',    ring: 'ring-teal-500/20',    glow: 'shadow-teal-500/10' },
  fuchsia: { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500/20', glow: 'shadow-fuchsia-500/10' },
};

export default function ServerDashboard() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [guild, setGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [guildRes, channelsRes, rolesRes] = await Promise.all([
          dashboardService.getGuildDetails(guildId),
          dashboardService.getGuildChannels(guildId),
          dashboardService.getGuildRoles(guildId)
        ]);
        setGuild(guildRes.data.data);
        setChannels(channelsRes.data.data);
        const rolesData = rolesRes.data.data;
        setRoles(Array.isArray(rolesData) ? rolesData : (rolesData?.roles || []));
      } catch {
        toast.error(t('dashboard.settingsSaveFailed'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/10 rounded-full" />
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <p className="text-gray-400 font-medium">{t('dashboard.loadingServer')}</p>
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
          <FaServer className="w-10 h-10 text-gray-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">{t('dashboard.serverNotFound')}</h2>
          <p className="text-gray-400">{t('dashboard.serverNotFoundDesc') || 'The server you are looking for does not exist or you do not have access.'}</p>
        </div>
        <button onClick={() => navigate('/servers')} className="btn-primary flex items-center gap-2">
          <FaArrowLeft className="w-4 h-4" />
          {t('dashboard.backToServers')}
        </button>
      </div>
    );
  }

  const serverName = guild.name || guild.guildName || 'Server';
  const serverId = guild.guildId || guild.id;
  const settings = guild.settings || {};

  const isModuleEnabled = (mod) => {
    if (mod.alwaysOn) return true;
    if (mod.settingsKey) return !!settings[mod.settingsKey];
    return null;
  };

  const handleToggleModule = async (mod, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mod.alwaysOn || !mod.settingsKey) return;
    const newVal = !settings[mod.settingsKey];
    try {
      await dashboardService.updateGuildSettings(guildId, { [mod.settingsKey]: newVal });
      setGuild(prev => ({
        ...prev,
        settings: { ...prev.settings, [mod.settingsKey]: newVal }
      }));
      toast.success(t(newVal ? 'dashboard.moduleEnabled' : 'dashboard.moduleDisabled'));
    } catch {
      toast.error(t('dashboard.settingsSaveFailed'));
    }
  };

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Server Banner */}
      <motion.div variants={fadeUp} className="relative">
        <div className="h-40 sm:h-52 rounded-2xl overflow-hidden relative">
          {guild.banner ? (
            <>
              <img
                src={`https://cdn.discordapp.com/banners/${serverId}/${guild.banner}.png?size=1024`}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-dark-950/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-600 via-indigo-600 to-purple-700">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 to-transparent" />
            </div>
          )}

          {/* Back button */}
          <div className="absolute top-4 left-4">
            <button
              onClick={() => navigate('/servers')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md text-white/90 hover:bg-black/50 hover:text-white transition-all text-sm font-medium border border-white/10"
            >
              <FaArrowLeft className="w-3 h-3" />
              <span>{t('common.back')}</span>
            </button>
          </div>

          {/* License badge */}
          {guild.license && (
            <div className="absolute top-4 right-4">
              <div className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md text-sm font-bold border',
                guild.license.tier === 'VIP'
                  ? 'bg-purple-500/25 text-purple-200 border-purple-400/30'
                  : 'bg-cyan-500/25 text-cyan-200 border-cyan-400/30'
              )}>
                <FaCrown className="w-3 h-3" />
                {guild.license.tier}
              </div>
            </div>
          )}
        </div>

        {/* Server info card overlapping banner */}
        <div className="relative -mt-16 mx-4 sm:mx-6">
          <GlassCard className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Server Icon */}
              <div className="relative flex-shrink-0 -mt-12 sm:-mt-14">
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${serverId}/${guild.icon}.png?size=128`}
                    alt={serverName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl border-4 border-dark-950 bg-dark-900 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl border-4 border-dark-950 bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-bold text-white">
                      {serverName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {guild.premiumTier > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg border-2 border-dark-950">
                    <FaCrown className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              {/* Server Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{serverName}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <FaUsers className="w-3.5 h-3.5" />
                    <span>{guild.memberCount?.toLocaleString() || '—'} {t('dashboard.members') || 'members'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <FaHashtag className="w-3.5 h-3.5" />
                    <span>{channels.length} {t('dashboard.channels') || 'channels'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <FaShieldAlt className="w-3.5 h-3.5" />
                    <span>{roles.length} {t('dashboard.roles') || 'roles'}</span>
                  </div>
                  {guild.premiumSubscriptionCount > 0 && (
                    <div className="flex items-center gap-1.5 text-pink-400 text-sm">
                      <FaCrown className="w-3.5 h-3.5" />
                      <span>{guild.premiumSubscriptionCount} boosts</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Server ID */}
              <div className="hidden lg:block text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Server ID</p>
                <p className="text-xs text-gray-400 font-mono">{serverId}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.div>

      {/* Module Grid by Category */}
      {CATEGORIES.map((cat) => {
        const catModules = MODULE_CARDS
          .filter(m => m.category === cat.id)
          .sort((a, b) => (t(a.labelKey) || '').localeCompare(t(b.labelKey) || ''));
        if (catModules.length === 0) return null;
        const isOpen = openCategories[cat.id];

        return (
          <motion.div key={cat.id} variants={fadeUp}>
            <button
              onClick={() => setOpenCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
              className="flex items-center gap-2 mb-4 group w-full text-left"
            >
              {isOpen
                ? <FaChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-300 transition-colors" />
                : <FaChevronRight className="w-3 h-3 text-gray-400 group-hover:text-gray-300 transition-colors" />
              }
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                {t(cat.labelKey) || cat.fallback}
              </h2>
              <span className="text-xs text-gray-500">({catModules.length})</span>
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {catModules.map((mod) => {
                  const colors = COLOR_MAP[mod.color] || COLOR_MAP.blue;
                  const enabled = isModuleEnabled(mod);
                  const hasToggle = !mod.alwaysOn && mod.settingsKey;

                  return (
                    <Link
                      key={mod.id}
                      to={`/servers/${guildId}/${mod.id}`}
                      className="block group"
                    >
                      <GlassCard
                        className={cn(
                          'p-3 relative overflow-hidden transition-all duration-300 flex items-center gap-3',
                          'hover:shadow-lg hover:-translate-y-0.5 hover:border-white/20',
                          enabled && colors.glow,
                          enabled === false && 'opacity-60',
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-lg ring-1 flex-shrink-0',
                          colors.bg, colors.ring,
                          'group-hover:scale-110 transition-transform duration-300'
                        )}>
                          <mod.icon className={cn('w-4 h-4', colors.text)} />
                        </div>

                        {/* Name + Toggle */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm truncate group-hover:text-primary-300 transition-colors">
                            {t(mod.labelKey)}
                          </h3>
                        </div>

                        {/* Toggle Switch */}
                        {hasToggle && (
                          <button
                            onClick={(e) => handleToggleModule(mod, e)}
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 flex-shrink-0',
                              enabled ? 'bg-green-500' : 'bg-white/15'
                            )}
                            role="switch"
                            aria-checked={!!enabled}
                          >
                            <span className={cn(
                              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                              enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            )} />
                          </button>
                        )}
                      </GlassCard>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
