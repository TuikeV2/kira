import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardService } from '../services/api.service';
import { useTranslation } from '../contexts/LanguageContext';
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
  FaCheckCircle,
  FaExclamationCircle,
  FaChevronDown,
  FaUserPlus,
  FaHashtag,
  FaUsers,
  FaCrown,
  FaCog,
  FaHome,
  FaMagic,
  FaComments,
  FaClipboardList,
  FaChevronRight,
  FaTimes,
  FaMicrophone,
  FaMusic
} from 'react-icons/fa';

import OverviewTab from '../components/dashboard/modules/OverviewTab';
import JoinLeaveTab from '../components/dashboard/modules/JoinLeaveTab';
import AutoModTab from '../components/dashboard/modules/AutoModTab';
import ReactionRolesTab from '../components/dashboard/modules/ReactionRolesTab';
import EmbedCreatorTab from '../components/dashboard/modules/EmbedCreatorTab';
import TicketTab from '../components/dashboard/modules/TicketTab';
import CustomCommandsTab from '../components/dashboard/modules/CustomCommandsTab';
import GiveawayTab from '../components/dashboard/modules/GiveawayTab';
import LevelingTab from '../components/dashboard/modules/LevelingTab';
import StatsChannelsTab from '../components/dashboard/modules/StatsChannelsTab';
import InviteLoggerTab from '../components/dashboard/modules/InviteLoggerTab';
import BotCustomizationTab from '../components/dashboard/modules/BotCustomizationTab';
import ChannelManagementTab from '../components/dashboard/modules/ChannelManagementTab';
import RoleManagementTab from '../components/dashboard/modules/RoleManagementTab';
import TempVoiceTab from '../components/dashboard/modules/TempVoiceTab';
import MusicTab from '../components/dashboard/modules/MusicTab';

const TAB_CATEGORIES = [
  {
    id: 'main',
    labelKey: 'dashboard.categories.main',
    icon: FaHome,
    tabs: [
      { id: 'overview', labelKey: 'dashboard.overview', icon: FaServer, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { id: 'bot-customization', labelKey: 'dashboard.botCustomization', icon: FaRobot, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ]
  },
  {
    id: 'management',
    labelKey: 'dashboard.categories.management',
    icon: FaCog,
    tabs: [
      { id: 'channel-management', labelKey: 'channelManagement.title', icon: FaHashtag, color: 'text-gray-500', bg: 'bg-gray-500/10' },
      { id: 'role-management', labelKey: 'roleManagement.title', icon: FaCrown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { id: 'automod', labelKey: 'dashboard.automod', icon: FaShieldAlt, color: 'text-red-500', bg: 'bg-red-500/10' },
    ]
  },
  {
    id: 'engagement',
    labelKey: 'dashboard.categories.engagement',
    icon: FaMagic,
    tabs: [
      { id: 'join-leave', labelKey: 'dashboard.joinLeave', icon: FaHandSparkles, color: 'text-green-500', bg: 'bg-green-500/10' },
      { id: 'invite-logger', labelKey: 'dashboard.inviteLogger', icon: FaUserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
      { id: 'leveling', labelKey: 'dashboard.leveling', icon: FaTrophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      { id: 'giveaways', labelKey: 'dashboard.giveaways', icon: FaGift, color: 'text-pink-500', bg: 'bg-pink-500/10' },
      { id: 'music', labelKey: 'dashboard.music', icon: FaMusic, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ]
  },
  {
    id: 'utilities',
    labelKey: 'dashboard.categories.utilities',
    icon: FaComments,
    tabs: [
      { id: 'embed-creator', labelKey: 'dashboard.embedCreator', icon: FaPaperPlane, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { id: 'reaction-roles', labelKey: 'dashboard.reactionRoles', icon: FaClipboardList, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { id: 'tickets', labelKey: 'dashboard.tickets', icon: FaTicketAlt, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { id: 'custom-commands', labelKey: 'dashboard.customCommands', icon: FaTerminal, color: 'text-violet-500', bg: 'bg-violet-500/10' },
      { id: 'stats-channels', labelKey: 'dashboard.statsChannels', icon: FaChartBar, color: 'text-teal-500', bg: 'bg-teal-500/10' },
      { id: 'temp-voice', labelKey: 'dashboard.tempVoice', icon: FaMicrophone, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' }
    ]
  }
];

export default function ServerDashboard() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [guild, setGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(['main', 'management', 'engagement', 'utilities']);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getAllTabs = () => {
    return TAB_CATEGORIES.flatMap(cat => cat.tabs).map(tab => ({
      ...tab,
      label: t(tab.labelKey)
    }));
  };

  const getActiveTabData = () => {
    const allTabs = getAllTabs();
    return allTabs.find(t => t.id === activeTab);
  };

  const refreshGuildData = async () => {
    try {
      const response = await dashboardService.getGuildDetails(guildId);
      setGuild(response.data.data);
    } catch (error) {
      // refresh error handled silently
    }
  };

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
        // API returns { roles, botHighestPosition }, extract roles array
        const rolesData = rolesRes.data.data;
        setRoles(Array.isArray(rolesData) ? rolesData : (rolesData?.roles || []));
      } catch (error) {
        setMessage({ type: 'error', text: t('dashboard.settingsSaveFailed') });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.loadingServer')}</p>
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800 flex items-center justify-center shadow-inner">
          <FaServer className="w-10 h-10 text-gray-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.serverNotFound')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('dashboard.serverNotFoundDesc') || 'The server you are looking for does not exist or you do not have access.'}</p>
        </div>
        <button
          onClick={() => navigate('/servers')}
          className="btn-primary flex items-center gap-2"
        >
          <FaArrowLeft className="w-4 h-4" />
          {t('dashboard.backToServers')}
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab guild={guild} channels={channels} roles={roles} onSave={refreshGuildData} />;
      case 'channel-management':
        return <ChannelManagementTab guildId={guildId} setMessage={setMessage} />;
      case 'role-management':
        return <RoleManagementTab guildId={guildId} setMessage={setMessage} />;
      case 'bot-customization':
        return (
          <BotCustomizationTab
            guildId={guildId}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'join-leave':
        return (
          <JoinLeaveTab
            guildId={guildId}
            channels={channels}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'invite-logger':
        return (
          <InviteLoggerTab
            guildId={guildId}
            channels={channels}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'automod':
        return (
          <AutoModTab
            guildId={guildId}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'embed-creator':
        return (
          <EmbedCreatorTab
            guildId={guildId}
            channels={channels}
            setMessage={setMessage}
          />
        );
      case 'reaction-roles':
        return (
          <ReactionRolesTab
            guildId={guildId}
            channels={channels}
            roles={roles}
            initialPanels={guild.settings?.reactionRoles}
            setMessage={setMessage}
            onUpdate={refreshGuildData}
          />
        );
      case 'tickets':
        return <TicketTab />;
      case 'custom-commands':
        return (
          <CustomCommandsTab
            guildId={guildId}
            setMessage={setMessage}
          />
        );
      case 'giveaways':
        return <GiveawayTab guildId={guildId} channels={channels} roles={roles} />;
      case 'leveling':
        return (
          <LevelingTab
            guildId={guildId}
            channels={channels}
            roles={roles}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'stats-channels':
        return (
          <StatsChannelsTab
            guildId={guildId}
            channels={channels}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'temp-voice':
        return (
          <TempVoiceTab
            guildId={guildId}
            channels={channels}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      case 'music':
        return (
          <MusicTab
            guildId={guildId}
            channels={channels}
            roles={roles}
            initialSettings={guild.settings}
            setMessage={setMessage}
            onSave={refreshGuildData}
          />
        );
      default:
        return <OverviewTab guild={guild} channels={channels} roles={roles} onSave={refreshGuildData} />;
    }
  };

  const activeTabData = getActiveTabData();

  return (
    <div className="min-h-screen">
      {/* Server Header */}
      <div className="relative mb-6">
        {/* Banner Background */}
        <div className="absolute inset-0 h-32 sm:h-40 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 rounded-2xl overflow-hidden">
          {guild.banner ? (
            <img
              src={`https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.png?size=1024`}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-4 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute top-10 right-10 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
            </div>
          )}
        </div>

        {/* Header Content */}
        <div className="relative pt-6 sm:pt-8 px-4 sm:px-6">
          <button
            onClick={() => navigate('/servers')}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium text-sm mb-4"
          >
            <FaArrowLeft className="w-3 h-3" />
            <span>{t('common.back')}</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 pb-4">
            {/* Server Icon */}
            <div className="relative">
              {guild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                  alt={guild.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl border-4 border-white dark:border-dark-800 bg-white dark:bg-dark-800"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl border-4 border-white dark:border-dark-800 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800 flex items-center justify-center">
                  <FaServer className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
              )}
              {guild.premiumTier > 0 && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <FaCrown className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Server Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate drop-shadow-md">{guild.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <FaUsers className="w-3.5 h-3.5" />
                  <span>{guild.memberCount?.toLocaleString() || '0'} {t('dashboard.members') || 'members'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <FaHashtag className="w-3.5 h-3.5" />
                  <span>{channels.length} {t('dashboard.channels') || 'channels'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <FaShieldAlt className="w-3.5 h-3.5" />
                  <span>{roles.length} {t('dashboard.roles') || 'roles'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {message.text && (
        <div
          className={`
            fixed bottom-6 right-6 z-50 max-w-md
            flex items-center gap-3 p-4 rounded-xl shadow-2xl
            animate-slide-up backdrop-blur-sm
            ${message.type === 'success'
              ? 'bg-green-50/95 dark:bg-green-900/80 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
              : message.type === 'warning'
              ? 'bg-yellow-50/95 dark:bg-yellow-900/80 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
              : 'bg-red-50/95 dark:bg-red-900/80 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
            }
          `}
        >
          {message.type === 'success' ? (
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          )}
          <p className="text-sm font-medium flex-1">{message.text}</p>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="card overflow-hidden lg:sticky lg:top-6">
            {/* Mobile Menu Toggle */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-indigo-900/30 text-primary-700 dark:text-primary-300"
              >
                <div className="flex items-center gap-3">
                  {activeTabData && (
                    <>
                      <div className={`w-8 h-8 rounded-lg ${activeTabData.bg} flex items-center justify-center`}>
                        <activeTabData.icon className={`w-4 h-4 ${activeTabData.color}`} />
                      </div>
                      <span className="font-semibold">{activeTabData.label}</span>
                    </>
                  )}
                </div>
                <FaChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Dropdown */}
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-100 dark:border-dark-700 py-2 z-20 max-h-[70vh] overflow-y-auto">
                    {TAB_CATEGORIES.map((category) => (
                      <div key={category.id}>
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {t(category.labelKey) || category.id}
                        </div>
                        {category.tabs.map((tab) => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`
                                w-full flex items-center gap-3 px-4 py-3
                                transition-all duration-200
                                ${isActive
                                  ? 'bg-primary-50 dark:bg-primary-900/30'
                                  : 'hover:bg-gray-50 dark:hover:bg-dark-700'
                                }
                              `}
                            >
                              <div className={`w-8 h-8 rounded-lg ${tab.bg} flex items-center justify-center`}>
                                <tab.icon className={`w-4 h-4 ${tab.color}`} />
                              </div>
                              <span className={`font-medium ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t(tab.labelKey)}
                              </span>
                              {isActive && (
                                <FaChevronRight className="w-3 h-3 ml-auto text-primary-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block p-3">
              {TAB_CATEGORIES.map((category, catIndex) => (
                <div key={category.id} className={catIndex > 0 ? 'mt-4' : ''}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="w-3 h-3" />
                      <span>{t(category.labelKey) || category.id}</span>
                    </div>
                    <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedCategories.includes(category.id) ? '' : '-rotate-90'}`} />
                  </button>

                  {expandedCategories.includes(category.id) && (
                    <div className="mt-1 space-y-1">
                      {category.tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                              transition-all duration-200 group
                              ${isActive
                                ? 'bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/40 dark:to-indigo-900/40 shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-dark-700/50'
                              }
                            `}
                          >
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
                              ${isActive ? tab.bg : 'bg-gray-100 dark:bg-dark-700 group-hover:' + tab.bg}
                            `}>
                              <tab.icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? tab.color : 'text-gray-400 dark:text-gray-500 group-hover:' + tab.color}`} />
                            </div>
                            <span className={`text-sm font-medium transition-colors duration-200 ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                              {t(tab.labelKey)}
                            </span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Server ID Footer */}
            <div className="hidden lg:block px-4 py-3 border-t border-gray-100 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-900/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-1">Server ID</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{guild.id}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Tab Header */}
          {activeTabData && (
            <div className="mb-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${activeTabData.bg} flex items-center justify-center shadow-sm`}>
                <activeTabData.icon className={`w-6 h-6 ${activeTabData.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeTabData.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t(`dashboard.${activeTab}Desc`) || t('dashboard.manageSettings')}
                </p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
