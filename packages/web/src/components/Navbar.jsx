import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { FaBell, FaSearch, FaSignOutAlt, FaUser, FaBars, FaCrown, FaKey, FaGift, FaServer, FaChevronRight, FaBox, FaChartLine, FaChartBar, FaUsers } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
// --- ZMIANA 1: Import Capacitora ---
import { Capacitor } from '@capacitor/core';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="glass border-b border-gray-200 dark:border-dark-700 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 transition-colors duration-200">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          aria-label={t('nav.openMenu') || 'Open menu'}
        >
          <FaBars className="w-5 h-5" />
        </button>

        {/* Search */}
        <div
          className={`
            hidden sm:flex items-center
            bg-gray-100 dark:bg-dark-800
            px-4 py-2.5 rounded-xl
            w-48 md:w-64 lg:w-80
            border transition-all duration-200
            ${searchFocused
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-gray-200 dark:border-dark-700'
            }
          `}
        >
          <FaSearch className="text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder={t('nav.searchServers')}
            className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 w-full placeholder-gray-400 dark:placeholder-gray-500"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Language selector */}
        <LanguageSelector compact />

        {/* Theme toggle */}
        <ThemeToggle size="md" />

        {/* Notifications */}
        <button
          className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          aria-label={t('nav.notifications') || 'Notifications'}
        >
          <FaBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Divider */}
        <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-dark-700"></div>

        {/* User menu */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              aria-label={t('nav.userMenu') || 'User menu'}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-none">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {user.role === 'ADMIN' ? 'Admin' : t('common.user')}
                </p>
              </div>
              <div className="relative">
                <img
                  src={user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt="Profile"
                  className="h-10 w-10 rounded-xl border-2 border-gray-200 dark:border-dark-600 shadow-sm object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-dark-800 rounded-full"></div>
              </div>
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-800 rounded-xl shadow-lg dark:shadow-dark-lg border border-gray-100 dark:border-dark-700 py-2 animate-fade-in z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                        : 'https://cdn.discordapp.com/embed/avatars/0.png'
                      }
                      alt="Avatar"
                      className="w-10 h-10 rounded-lg"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email || t('common.noEmail')}</p>
                    </div>
                  </div>
                </div>

                {/* My Account */}
                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setShowDropdown(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    <FaUser className="w-4 h-4 text-blue-500" />
                    {t('nav.myAccount') || 'Moje konto'}
                    <FaChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                  </Link>
                </div>

                {/* Admin Panel - only for admins */}
                {user.role === 'ADMIN' && (
                  <div className="border-t border-gray-100 dark:border-dark-700 py-1">
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-2">
                        <FaCrown className="w-3 h-3" />
                        Panel Admina
                      </p>
                    </div>
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaChartLine className="w-4 h-4 text-purple-500" />
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/users"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaUsers className="w-4 h-4 text-purple-500" />
                      Uzytkownicy
                    </Link>
                    <Link
                      to="/admin/stats"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaChartBar className="w-4 h-4 text-purple-500" />
                      Statystyki
                    </Link>
                    <Link
                      to="/admin/licenses"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaKey className="w-4 h-4 text-purple-500" />
                      Licencje
                    </Link>
                    <Link
                      to="/admin/promo-codes"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaGift className="w-4 h-4 text-purple-500" />
                      Promokody
                    </Link>
                    <Link
                      to="/admin/servers"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaServer className="w-4 h-4 text-purple-500" />
                      Wszystkie serwery
                    </Link>
                    <Link
                      to="/admin/products"
                      onClick={() => setShowDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <FaBox className="w-4 h-4 text-purple-500" />
                      Produkty
                    </Link>
                  </div>
                )}

                {/* Logout */}
                <div className="border-t border-gray-100 dark:border-dark-700 pt-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* --- ZMIANA 2: Warunkowy Link zamiast <a> --- */
          <Link
            to={Capacitor.isNativePlatform() ? "/login?source=app" : "/login"}
            className="btn-primary text-sm"
          >
            {t('nav.login')}
          </Link>
        )}
      </div>
    </nav>
  );
}
