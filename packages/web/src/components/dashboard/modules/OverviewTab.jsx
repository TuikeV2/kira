import { useState } from 'react';
import { FaHashtag, FaUsers, FaRobot, FaCog, FaCrown, FaGem, FaSave } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { cn } from '../../../lib/utils';

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
    { icon: FaHashtag, labelKey: 'common.channels', value: channels.length, color: 'blue' },
    { icon: FaUsers, labelKey: 'common.roles', value: roles.length, color: 'purple' },
    { icon: FaRobot, labelKey: 'dashboard.reactionPanels', value: reactionPanelsCount, color: 'green' }
  ];

  const colorClasses = {
    blue: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',
    purple: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
    green: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/20'
  };

  return (
    <div className="space-y-6">
      {/* Server Header */}
      <GlassCard className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {guild.guildName}
            </h1>
            <p className="text-gray-400">
              {t('dashboard.manageServer')}
            </p>
          </div>
          {guild.license && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl ring-1 ring-white/10">
              <div className={cn(
                'p-2 rounded-lg',
                guild.license.tier === 'VIP'
                  ? 'bg-purple-500/15 ring-1 ring-purple-500/20'
                  : 'bg-cyan-500/15 ring-1 ring-cyan-500/20'
              )}>
                {guild.license.tier === 'VIP' ? (
                  <FaCrown className="w-5 h-5 text-purple-400" />
                ) : (
                  <FaGem className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {guild.license.tier || 'Standard'}
                </div>
                <div className="text-xs text-gray-400">
                  {t('dashboard.expires')}: {guild.license.expiresAt
                    ? new Date(guild.license.expiresAt).toLocaleDateString()
                    : t('dashboard.never')}
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <GlassCard key={index} className="p-5">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl', colorClasses[stat.color])}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {t(stat.labelKey)}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">
                  {stat.value}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Bot Configuration */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/15 ring-1 ring-blue-500/20">
            <FaCog className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('dashboard.botConfig')}</h2>
            <p className="text-sm text-gray-400">{t('dashboard.botConfigDesc')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">{t('dashboard.commandPrefix')}</label>
            <input
              type="text"
              value={prefixSettings.customCommandPrefix}
              onChange={(e) => setPrefixSettings({ ...prefixSettings, customCommandPrefix: e.target.value })}
              className="input max-w-xs font-mono"
              maxLength={5}
              placeholder="!"
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('dashboard.prefixHint')}
              {' ('}
              <code className="px-1 py-0.5 bg-white/5 rounded text-primary-400">
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
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      </GlassCard>
    </div>
  );
}
