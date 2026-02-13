import { useState } from 'react';
import { FaHashtag, FaUsers, FaRobot, FaCog, FaCrown, FaGem, FaSave } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function OverviewTab({ guild, channels, roles, onSave }) {
  const { t } = useTranslation();
  const toast = useToast();
  const reactionPanelsCount = guild?.settings?.reactionRoles?.length || 0;
  const [saving, setSaving] = useState(false);
  const [prefixSettings, setPrefixSettings] = useState({
    customCommandPrefix: guild?.settings?.customCommandPrefix || '!',
    slashCommandsOnly: guild?.settings?.slashCommandsOnly || false
  });

  const handleSavePrefixes = async () => {
    setSaving(true);
    try {
      await dashboardService.updateGuildSettings(guild.guildId, prefixSettings);
      toast.success(t('dashboard.prefixSaved'));
      if (onSave) onSave();
    } catch (error) {
      toast.error(t('dashboard.settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    {
      icon: FaHashtag,
      labelKey: 'common.channels',
      value: channels.length,
      color: 'blue'
    },
    {
      icon: FaUsers,
      labelKey: 'common.roles',
      value: roles.length,
      color: 'purple'
    },
    {
      icon: FaRobot,
      labelKey: 'dashboard.reactionPanels',
      value: reactionPanelsCount,
      color: 'green'
    }
  ];

  const colorClasses = {
    blue: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
  };

  return (
    <div className="space-y-6">
      {/* Server Header */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {guild.guildName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('dashboard.manageServer')}
            </p>
          </div>
          {guild.license && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
              <div className={`p-2 rounded-lg ${
                guild.license.tier === 'VIP'
                  ? 'bg-purple-100 dark:bg-purple-900/30'
                  : 'bg-primary-100 dark:bg-primary-900/30'
              }`}>
                {guild.license.tier === 'VIP' ? (
                  <FaCrown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <FaGem className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  {guild.license.tier || 'Standard'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('dashboard.expires')}: {guild.license.expiresAt
                    ? new Date(guild.license.expiresAt).toLocaleDateString()
                    : t('dashboard.never')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t(stat.labelKey)}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bot Configuration */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <FaCog className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('dashboard.botConfig')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.botConfigDesc')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">
              {t('dashboard.commandPrefix')}
            </label>
            <input
              type="text"
              value={prefixSettings.customCommandPrefix}
              onChange={(e) => setPrefixSettings({ ...prefixSettings, customCommandPrefix: e.target.value })}
              className="input max-w-xs font-mono"
              maxLength={5}
              placeholder="!"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('dashboard.prefixHint')}
              {' ('}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-700 rounded text-primary-600 dark:text-primary-400">
                {prefixSettings.customCommandPrefix}welcome
              </code>
              {')'}
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSavePrefixes}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('dashboard.saving')}
                </>
              ) : (
                <>
                  <FaSave className="w-4 h-4" />
                  {t('dashboard.saveSettings')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
