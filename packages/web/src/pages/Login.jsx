import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { authService } from '../services/api.service';
import {
  FaDiscord,
  FaRobot,
  FaShieldAlt,
  FaTrophy,
  FaGift,
  FaTerminal,
  FaCog,
  FaArrowRight,
  FaHeart,
  FaSun,
  FaMoon,
  FaCheck
} from 'react-icons/fa';
import LanguageSelector from '../components/LanguageSelector';

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1237706962158878752';

export default function Login() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = () => {
    authService.initiateOAuth();
  };

  const features = [
    {
      icon: FaShieldAlt,
      titleKey: 'login.features.automod',
      descKey: 'login.features.automodDesc',
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: FaTrophy,
      titleKey: 'login.features.leveling',
      descKey: 'login.features.levelingDesc',
      color: 'from-yellow-500 to-amber-500'
    },
    {
      icon: FaGift,
      titleKey: 'login.features.giveaways',
      descKey: 'login.features.giveawaysDesc',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: FaRobot,
      titleKey: 'login.features.reactionRoles',
      descKey: 'login.features.reactionRolesDesc',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: FaTerminal,
      titleKey: 'login.features.customCommands',
      descKey: 'login.features.customCommandsDesc',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: FaCog,
      titleKey: 'login.features.webDashboard',
      descKey: 'login.features.webDashboardDesc',
      color: 'from-blue-500 to-cyan-500'
    }
  ];

  const stats = [
    { value: '10+', labelKey: 'login.stats.features' },
    { value: '24/7', labelKey: 'login.stats.online' },
    { value: '99.9%', labelKey: 'login.stats.uptime' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 blur-lg opacity-50"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <FaRobot className="text-white text-lg" />
                </div>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                KiraEvo
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <LanguageSelector compact />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
              >
                {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
              </button>

              <a
                href={INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
              >
                <FaDiscord />
                <span>{t('login.inviteBot')}</span>
              </a>

              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-primary-500/25 transition-all duration-200"
              >
                <span>{t('nav.login')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {t('login.badge')}
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Kira<span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">Evo</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('login.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-primary-500/25 transition-all duration-200 text-lg"
            >
              <FaDiscord className="text-xl" />
              <span>{t('login.addToServer')}</span>
            </a>
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 text-gray-800 dark:text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 text-lg border border-gray-200 dark:border-dark-700"
            >
              <span>{t('login.openPanel')}</span>
              <FaArrowRight />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50/50 dark:bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('login.featuresTitle')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              {t('login.featuresSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group card p-6 hover:shadow-soft-lg dark:hover:shadow-dark-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="text-white text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-purple-600 p-8 sm:p-12">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="relative text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                {t('login.ctaTitle')}
              </h2>
              <p className="text-primary-100 mb-8 text-lg max-w-lg mx-auto">
                {t('login.ctaDescription')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary-600 font-semibold py-4 px-8 rounded-xl hover:bg-gray-100 transition-all duration-200 text-lg shadow-lg"
                >
                  <FaDiscord className="text-xl" />
                  <span>{t('login.ctaButton')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-gray-50/50 dark:bg-dark-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {['benefit1', 'benefit2', 'benefit3', 'benefit4'].map((key, index) => (
              <div key={index} className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                <FaCheck className="w-4 h-4 text-green-500" />
                <span className="font-medium">{t(`login.benefits.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-dark-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                <FaRobot className="text-white text-sm" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">KiraEvo</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('login.footer.terms')}
              </Link>
              <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('login.footer.privacy')}
              </Link>
              <a
                href={INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('login.inviteBot')}
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-dark-800 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p className="flex items-center justify-center gap-1">
              Made with <FaHeart className="text-red-500" /> by Tuike
            </p>
            <p className="mt-2">
              &copy; {new Date().getFullYear()} KiraEvo Bot. {t('login.footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
