import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { authService } from '../services/api.service';
import { FaDiscord, FaSun, FaMoon } from 'react-icons/fa';
import LanguageSelector from '../components/LanguageSelector';
import botAvatar from '../assets/img/avatar.png';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export default function Login() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('app_auth_session', sessionId);
      window.dispatchEvent(new Event('app-auth-start'));
      const stateParam = encodeURIComponent(`app_${sessionId}`);
      const discordUrl = `https://discord.com/oauth2/authorize?client_id=1237706962158878752&redirect_uri=https%3A%2F%2Fapi.kiraevo.pl%2Fapi%2Fauth%2Fdiscord%2Fcallback&response_type=code&scope=identify%20guilds&state=${stateParam}`;

      await Browser.open({ url: discordUrl, windowName: '_blank' });
    } else {
      authService.initiateOAuth();
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-primary-500/10 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 left-6 z-10">
        <LanguageSelector compact />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-10 p-2.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <motion.img
              src={botAvatar}
              alt="KiraEvo"
              className="w-16 h-16 rounded-2xl shadow-lg shadow-primary-500/20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            />
          </div>

          <motion.div
            className="text-center mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-white">
              Kira<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Evo</span>
            </h1>
          </motion.div>

          <motion.p
            className="text-center text-gray-400 text-sm mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {t('login.subtitle') || 'Login to manage your bot'}
          </motion.p>

          <motion.button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#5865F2] to-[#4752C4] hover:from-[#4752C4] hover:to-[#3C45A5] text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-[#5865F2]/25 transition-all duration-200 text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaDiscord className="text-xl" />
            <span>{t('login.discordLogin') || 'Continue with Discord'}</span>
          </motion.button>

          <motion.div
            className="my-6 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          />

          <motion.div
            className="flex items-center justify-center gap-4 text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Link
              to="/terms"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              {t('login.footer.terms') || 'Terms'}
            </Link>
            <span className="text-white/20">|</span>
            <Link
              to="/privacy"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              {t('login.footer.privacy') || 'Privacy'}
            </Link>
            <span className="text-white/20">|</span>
            <Link
              to="/"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              {t('login.backToHome') || 'Back to home'}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}