import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { licenseService, dashboardService } from '../services/api.service';
import {
  FaKey,
  FaServer,
  FaCheckCircle,
  FaCrown,
  FaShieldAlt,
  FaTimesCircle,
  FaInfoCircle,
  FaRocket,
  FaCheck,
  FaCopy
} from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function ActivateLicense() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [formData, setFormData] = useState({ licenseKey: '', guildId: '' });
  const [activationResult, setActivationResult] = useState(null);
  const [selectedGuild, setSelectedGuild] = useState(null);

  useEffect(() => {
    fetchUserGuilds();
  }, []);

  const fetchUserGuilds = async () => {
    try {
      const response = await dashboardService.getUserGuilds();
      setGuilds(response.data.data || []);
    } catch (error) {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuildSelect = (guildId) => {
    setFormData({ ...formData, guildId });
    const guild = guilds.find(g => g.id === guildId);
    setSelectedGuild(guild);
  };

  const handleActivate = async (e) => {
    e.preventDefault();

    if (!formData.licenseKey.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    if (!formData.guildId) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    setActivating(true);
    setActivationResult(null);

    try {
      const response = await licenseService.activate({
        licenseKey: formData.licenseKey.trim(),
        guildId: formData.guildId,
        guildName: selectedGuild?.name
      });

      setActivationResult({
        success: true,
        message: t('pages.activateLicense.activated'),
        data: response.data.data
      });

      toast.success(t('pages.activateLicense.activatedSuccess'));
      setFormData({ licenseKey: '', guildId: '' });
      setSelectedGuild(null);

      // Refresh guilds
      setTimeout(() => fetchUserGuilds(), 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Nie udalo sie aktywowac licencji';
      setActivationResult({
        success: false,
        message: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setActivating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nigdy';
    return date.toLocaleDateString('pl-PL');
  };

  // Filter guilds - show all but mark which have license
  const availableGuilds = guilds.filter(g => g.registered);
  const guildsWithoutLicense = availableGuilds.filter(g => !g.license || g.license.tier === 'FREE');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg mb-4">
          <FaKey className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('pages.activateLicense.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {t('pages.activateLicense.subtitle')}
        </p>
      </div>

      {/* Info box */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <FaInfoCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">{t('pages.activateLicense.howTo')}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('pages.activateLicense.step1')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">KIRA-XXXX-XXXX-XXXX</code></li>
              <li>{t('pages.activateLicense.step2')}</li>
              <li>{t('pages.activateLicense.step3')}</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Form */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FaRocket className="text-primary-500" />
            {t('pages.activateLicense.formTitle')}
          </h2>

          <form onSubmit={handleActivate} className="space-y-6">
            {/* License Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FaKey className="text-amber-500" />
                {t('pages.activateLicense.licenseKey')}
              </label>
              <input
                type="text"
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value.toUpperCase() })}
                placeholder="KIRA-XXXX-XXXX-XXXX"
                className="input font-mono text-center text-lg tracking-wider"
                required
              />
            </div>

            {/* Server Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FaServer className="text-primary-500" />
                Wybierz Serwer
              </label>

              {availableGuilds.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Bot nie jest na zadnym z Twoich serwerow. Dodaj bota na serwer, aby moc aktywowac licencje.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableGuilds.map((guild) => {
                    const isSelected = formData.guildId === guild.id;
                    const hasLicense = guild.license && guild.license.tier !== 'FREE';

                    return (
                      <div
                        key={guild.id}
                        onClick={() => handleGuildSelect(guild.id)}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                          ${isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                            : 'bg-gray-50 dark:bg-dark-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-600'
                          }
                        `}
                      >
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt={guild.name}
                            className="w-10 h-10 rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-600 flex items-center justify-center">
                            <FaServer className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {guild.name}
                          </p>
                          {hasLicense && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Obecna licencja: {guild.license.tier}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <FaCheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
                        )}
                        {hasLicense && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            guild.license.tier === 'VIP'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {guild.license.tier}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activation Result */}
            {activationResult && (
              <div className={`p-4 rounded-xl ${
                activationResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {activationResult.success ? (
                    <FaCheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <FaTimesCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    activationResult.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {activationResult.message}
                  </span>
                </div>
                {activationResult.success && activationResult.data?.license && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Tier: <span className="font-medium">{activationResult.data.license.tier}</span>
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Wygasa: <span className="font-medium">{formatDate(activationResult.data.license.expiresAt)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={activating || !formData.licenseKey || !formData.guildId}
              className={`
                w-full py-4 rounded-xl font-bold text-lg
                flex items-center justify-center gap-3
                transition-all duration-300
                ${(!formData.licenseKey || !formData.guildId)
                  ? 'bg-gray-300 dark:bg-dark-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                }
              `}
            >
              {activating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Aktywowanie...
                </>
              ) : (
                <>
                  <FaShieldAlt className="w-5 h-5" />
                  Aktywuj Licencje
                </>
              )}
            </button>
          </form>
        </div>

        {/* Servers List */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FaServer className="text-primary-500" />
            Twoje Serwery
          </h2>

          {guilds.length === 0 ? (
            <div className="text-center py-8">
              <FaServer className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nie znaleziono serwerow. Upewnij sie, ze masz uprawnienia do zarzadzania serwerami.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guilds.map((guild) => {
                const hasLicense = guild.registered && guild.license && guild.license.tier !== 'FREE';

                return (
                  <div
                    key={guild.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {guild.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                          alt={guild.name}
                          className="w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-500 flex items-center justify-center">
                          <FaServer className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{guild.name}</h3>
                        <div className="flex items-center gap-2 text-xs">
                          {guild.owner && (
                            <span className="text-primary-600 dark:text-primary-400">Wlasciciel</span>
                          )}
                          {guild.registered ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <FaCheck className="w-3 h-3" /> Bot aktywny
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Bot nieaktywny</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {hasLicense ? (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          guild.license.tier === 'VIP'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}>
                          <FaCrown className="w-3 h-3" />
                          {guild.license.tier}
                        </span>
                      ) : guild.registered ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-400">
                          Brak licencji
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          Dodaj bota
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Link to buy */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Nie masz jeszcze licencji?
            </p>
            <button
              onClick={() => navigate('/buy')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <FaCrown className="w-4 h-4" />
              Kup Licencje VIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
