import { Link, useLocation } from 'react-router-dom';
import {
  FaHome, FaKey, FaServer, FaGavel, FaCheckCircle, FaDiscord, FaTimes,
  FaCrown, FaChevronLeft, FaChevronRight, FaPercent, FaChartLine,
  FaUsers, FaChartBar, FaBox, FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { Tooltip } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';

const USER_MENU_ITEMS = [
  { path: '/', icon: FaHome, labelKey: 'nav.dashboard', adminOnly: true },
  { path: '/admin/licenses', icon: FaKey, labelKey: 'nav.licenses', adminOnly: true },
  { path: '/admin/promo-codes', icon: FaPercent, labelKey: 'nav.promoCodes', adminOnly: true },
  { path: '/buy', icon: FaCrown, labelKey: 'nav.buyLicense', adminOnly: false },
  { path: '/my-licenses', icon: FaKey, labelKey: 'licenses.myLicenses', adminOnly: false },
  { path: '/activate', icon: FaCheckCircle, labelKey: 'nav.activateLicense', adminOnly: false },
  { path: '/servers', icon: FaServer, labelKey: 'nav.servers', adminOnly: false },
  { path: '/moderation', icon: FaGavel, labelKey: 'nav.moderationLogs', adminOnly: false },
];

const USER_ADMIN_ITEMS = [
  { path: '/admin/dashboard', icon: FaChartLine, labelKey: 'adminDashboard.title' },
  { path: '/admin/users', icon: FaUsers, labelKey: 'adminUsers.title' },
  { path: '/admin/stats', icon: FaChartBar, labelKey: 'adminStats.title' },
  { path: '/admin/servers', icon: FaServer, labelKey: 'nav.allServers' },
  { path: '/admin/products', icon: FaBox, labelKey: 'nav.products' },
];

const ADMIN_MENU_ITEMS = [
  { path: '/admin/dashboard', icon: FaChartLine, labelKey: 'adminDashboard.title' },
  { path: '/admin/users', icon: FaUsers, labelKey: 'adminUsers.title' },
  { path: '/admin/servers', icon: FaServer, labelKey: 'nav.allServers' },
  { path: '/admin/products', icon: FaBox, labelKey: 'nav.products' },
  { path: '/admin/stats', icon: FaChartBar, labelKey: 'adminStats.title' },
  { path: '/admin/licenses', icon: FaKey, labelKey: 'nav.licenses' },
  { path: '/admin/promo-codes', icon: FaPercent, labelKey: 'nav.promoCodes' },
];

const VARIANT_CONFIG = {
  user: {
    headerIcon: FaDiscord,
    headerTitle: 'KiraEvo',
    headerSubtitle: 'Panel',
    headerGradient: 'from-primary-500 to-primary-700',
    headerGlow: 'bg-primary-500',
    accentGradient: 'from-primary-600 to-primary-500',
    accentShadow: 'shadow-primary-500/25',
    sectionLabel: 'Admin',
    sectionColor: 'text-purple-400',
    adminGradient: 'from-purple-600 to-purple-500',
    adminShadow: 'shadow-purple-500/25',
    footerBg: 'bg-dark-800/50',
    footerBorder: 'border-dark-700',
    footerDot: 'bg-green-500',
    footerLabel: 'v1.2.0-beta',
    footerBadge: 'bg-primary-500/20 text-primary-400',
    footerBadgeText: 'Stable',
  },
  admin: {
    headerIcon: FaCrown,
    headerTitle: 'Admin',
    headerSubtitle: 'Panel',
    headerGradient: 'from-purple-500 to-purple-700',
    headerGlow: 'bg-purple-500',
    accentGradient: 'from-purple-600 to-purple-500',
    accentShadow: 'shadow-purple-500/25',
    sectionLabel: 'Administracja',
    sectionColor: 'text-purple-400',
    adminGradient: 'from-purple-600 to-purple-500',
    adminShadow: 'shadow-purple-500/25',
    footerBg: 'bg-purple-900/30',
    footerBorder: 'border-purple-800/50',
    footerDot: 'bg-purple-500',
    footerLabel: 'Panel Administratora',
    footerBadge: '',
    footerBadgeText: '',
  },
};

function SidebarLink({ item, isActive, isCollapsed, onClose, gradient, shadow }) {
  const { t } = useTranslation();
  const label = t(item.labelKey) || item.labelKey;

  const linkContent = (
    <Link
      to={item.path}
      onClick={onClose}
      className={`
        group flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl
        transition-all duration-200
        ${isActive
          ? `bg-gradient-to-r ${gradient} text-white shadow-lg ${shadow}`
          : 'text-gray-400 hover:bg-dark-800 hover:text-white'
        }
      `}
    >
      <div className={`
        p-2 rounded-lg transition-all duration-200
        ${isActive ? 'bg-white/20' : 'bg-dark-800 group-hover:bg-dark-700'}
      `}>
        <item.icon className="w-4 h-4" />
      </div>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="font-medium text-sm overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip key={item.path} content={label} position="right">
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}

export default function UnifiedSidebar({ variant = 'user', isOpen = false, onClose = () => {}, isCollapsed = false, onToggleCollapse = () => {} }) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const config = VARIANT_CONFIG[variant];
  const HeaderIcon = config.headerIcon;
  const isAdmin = user?.role === 'ADMIN';

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';

  return (
    <aside
      className={`
        bg-dark-900 dark:bg-dark-950
        ${sidebarWidth}
        flex flex-col
        fixed inset-y-0 left-0
        transform transition-all duration-300 ease-out
        z-30
        md:relative md:translate-x-0
        border-r border-dark-800 dark:border-dark-700
        shadow-2xl md:shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-5 border-b border-dark-800`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`absolute inset-0 ${config.headerGlow} blur-lg opacity-50`}></div>
            <div className={`relative bg-gradient-to-br ${config.headerGradient} p-2.5 rounded-xl shadow-lg`}>
              <HeaderIcon className="text-xl text-white" />
            </div>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <span className="text-xl font-bold text-white tracking-wide whitespace-nowrap">
                  {config.headerTitle}<span className="font-light text-gray-400">{config.headerSubtitle}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isCollapsed && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-dark-800 border border-dark-700 rounded-full items-center justify-center text-gray-400 hover:text-white hover:bg-dark-700 transition-colors z-40"
      >
        {isCollapsed ? <FaChevronRight className="w-3 h-3" /> : <FaChevronLeft className="w-3 h-3" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {/* Admin variant: "Back to panel" link */}
        {variant === 'admin' && (
          <>
            <SidebarLink
              item={{ path: '/servers', icon: FaArrowLeft, labelKey: 'nav.backToPanel' }}
              isActive={false}
              isCollapsed={isCollapsed}
              onClose={onClose}
              gradient={config.accentGradient}
              shadow={config.accentShadow}
            />
            <div className="border-t border-dark-800 my-3"></div>
          </>
        )}

        {/* Section label */}
        {variant === 'admin' && (
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-xs font-semibold ${config.sectionColor} uppercase tracking-wider px-3 mb-3 flex items-center gap-2`}
              >
                <FaCrown className="w-3 h-3" />
                {config.sectionLabel}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {variant === 'user' && (
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3"
              >
                Menu
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Main menu items */}
        {variant === 'user' && (
          <>
            {USER_MENU_ITEMS
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                  isCollapsed={isCollapsed}
                  onClose={onClose}
                  gradient={config.accentGradient}
                  shadow={config.accentShadow}
                />
              ))}

            {/* Admin section for user variant */}
            {isAdmin && (
              <>
                <div className="my-3 border-t border-dark-800"></div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 mb-3 flex items-center gap-2"
                    >
                      <FaCrown className="w-3 h-3" />
                      Admin
                    </motion.div>
                  )}
                </AnimatePresence>
                {USER_ADMIN_ITEMS.map((item) => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    isCollapsed={isCollapsed}
                    onClose={onClose}
                    gradient={config.adminGradient}
                    shadow={config.adminShadow}
                  />
                ))}
              </>
            )}
          </>
        )}

        {variant === 'admin' && (
          ADMIN_MENU_ITEMS.map((item) => (
            <SidebarLink
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              isCollapsed={isCollapsed}
              onClose={onClose}
              gradient={config.accentGradient}
              shadow={config.accentShadow}
            />
          ))
        )}
      </nav>

      {/* Footer */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-dark-800"
          >
            <div className={`${config.footerBg} rounded-xl p-4 border ${config.footerBorder}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${config.footerDot} animate-pulse`}></div>
                <p className="text-xs font-medium text-gray-300">{config.footerLabel}</p>
              </div>
              {variant === 'user' && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>v1.2.0-beta</span>
                  <span className={`px-2 py-0.5 ${config.footerBadge} rounded-full`}>
                    {config.footerBadgeText}
                  </span>
                </div>
              )}
              {variant === 'admin' && (
                <p className="text-xs text-gray-400">
                  {t('nav.fullSystemAccess') || 'Pelny dostep do systemu'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed footer indicator */}
      {isCollapsed && (
        <div className="p-4 border-t border-dark-800 flex justify-center">
          <div className={`w-3 h-3 rounded-full ${config.footerDot} animate-pulse`}></div>
        </div>
      )}
    </aside>
  );
}
