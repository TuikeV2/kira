import { useState, useEffect } from 'react';
import { FaRobot, FaSave, FaSignature, FaGlobe } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';
import botAvatar from '../../../assets/img/avatar.png';

const GUILD_LANGUAGES = [
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function BotCustomizationTab({ guildId, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    botNickname: '',
    language: 'pl'
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        ...prev,
        botNickname: initialSettings.botNickname || '',
        language: initialSettings.language || 'pl'
      }));
    }
  }, [initialSettings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dashboardService.updateGuildSettings(guildId, {
        botNickname: settings.botNickname,
        language: settings.language
      });
      setMessage({ type: 'success', text: t('dashboard.settingsSaved') });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: t('dashboard.settingsSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Settings Form */}
      <div className="flex-1 space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Bot Customization Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <FaRobot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('botCustomization.title')}</h2>
            </div>

            <div className="space-y-6">
              {/* Server Language */}
              <div>
                <label className="label">
                  <FaGlobe className="inline w-3 h-3 mr-1" />
                  {t('common.language')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {GUILD_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSettings({ ...settings, language: lang.code })}
                      className={`
                        flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all
                        ${settings.language === lang.code
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-medium text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('common.language')} - Bot responses on this server will be in selected language.
                </p>
              </div>

              {/* Bot Nickname */}
              <div>
                <label className="label">
                  <FaSignature className="inline w-3 h-3 mr-1" />
                  {t('botCustomization.nickname')}
                </label>
                <input
                  type="text"
                  value={settings.botNickname}
                  onChange={e => setSettings({ ...settings, botNickname: e.target.value })}
                  placeholder={t('botCustomization.nicknamePlaceholder')}
                  maxLength={32}
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('botCustomization.nicknameHint')}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('common.loading')}
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                {t('common.saveChanges')}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Preview */}
      <div className="w-full xl:w-80 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {t('dashboard.preview')}
          </h3>
          <div className="card p-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar Preview */}
              <div className="relative">
                <img
                  src={botAvatar}
                  alt="KiraEvo"
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-dark-700 shadow-lg object-cover"
                />
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-dark-700"></div>
              </div>

              {/* Name Preview */}
              <div className="mt-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {settings.botNickname || 'KiraEvo'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bot
                </p>
              </div>

              {/* Discord-like user card preview */}
              <div className="mt-6 w-full bg-gray-100 dark:bg-dark-700 rounded-lg p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={botAvatar}
                      alt="KiraEvo"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-100 dark:border-dark-700"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {settings.botNickname || 'KiraEvo'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500 text-white">
                        BOT
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Dzisiaj o 12:00
                    </p>
                  </div>
                </div>
                <div className="mt-3 pl-[52px]">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Witaj! Jestem gotowy do pomocy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
