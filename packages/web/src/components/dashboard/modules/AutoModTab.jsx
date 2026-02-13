import { useState, useEffect } from 'react';
import {
  FaShieldAlt,
  FaLink,
  FaBan,
  FaSave,
  FaFire,
  FaFont,
  FaSmile,
  FaAt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

// Toggle Switch Component
function ToggleSwitch({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
          ${enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'}
        `}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-200
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

export default function AutoModTab({ guildId, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [automod, setAutomod] = useState({
    enabled: false,

    // Link Filters
    blockLinks: false,
    blockDiscordInvites: false,
    bannedWords: '',

    // Spam Detection
    antiSpamDuplicate: false,
    duplicateTimeWindow: 30,
    duplicateMaxCount: 3,
    antiSpamFlood: false,
    floodTimeWindow: 5,
    floodMaxMessages: 5,

    // Content Filters
    antiCaps: false,
    capsPercentage: 70,
    capsMinLength: 10,
    antiEmoji: false,
    maxEmojis: 10,
    antiMention: false,
    maxMentions: 5,
    blockEveryoneHere: true,

    // Escalation
    violationDecayHours: 24,
    escalation: {
      enabled: false,
      warn: 1,
      mute1h: 2,
      mute24h: 3,
      kick: 4,
      ban: 5
    }
  });

  useEffect(() => {
    if (initialSettings && initialSettings.automod) {
      const settings = initialSettings.automod;
      setAutomod({
        enabled: settings.enabled || false,

        // Link Filters
        blockLinks: settings.blockLinks || false,
        blockDiscordInvites: settings.blockDiscordInvites || false,
        bannedWords: settings.bannedWords ? settings.bannedWords.join(', ') : '',

        // Spam Detection
        antiSpamDuplicate: settings.antiSpamDuplicate || false,
        duplicateTimeWindow: settings.duplicateTimeWindow ? settings.duplicateTimeWindow / 1000 : 30,
        duplicateMaxCount: settings.duplicateMaxCount || 3,
        antiSpamFlood: settings.antiSpamFlood || false,
        floodTimeWindow: settings.floodTimeWindow ? settings.floodTimeWindow / 1000 : 5,
        floodMaxMessages: settings.floodMaxMessages || 5,

        // Content Filters
        antiCaps: settings.antiCaps || false,
        capsPercentage: settings.capsPercentage || 70,
        capsMinLength: settings.capsMinLength || 10,
        antiEmoji: settings.antiEmoji || false,
        maxEmojis: settings.maxEmojis || 10,
        antiMention: settings.antiMention || false,
        maxMentions: settings.maxMentions || 5,
        blockEveryoneHere: settings.blockEveryoneHere !== false,

        // Escalation
        violationDecayHours: settings.violationDecayHours || 24,
        escalation: {
          enabled: settings.escalation?.enabled || false,
          warn: settings.escalation?.warn || 1,
          mute1h: settings.escalation?.mute1h || 2,
          mute24h: settings.escalation?.mute24h || 3,
          kick: settings.escalation?.kick || 4,
          ban: settings.escalation?.ban || 5
        }
      });
    }
  }, [initialSettings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate and convert data
      const automodData = {
        enabled: automod.enabled,

        // Link Filters
        blockLinks: automod.blockLinks,
        blockDiscordInvites: automod.blockDiscordInvites,
        bannedWords: automod.bannedWords.split(',').map(w => w.trim()).filter(w => w.length > 0),

        // Spam Detection
        antiSpamDuplicate: automod.antiSpamDuplicate,
        duplicateTimeWindow: automod.duplicateTimeWindow * 1000, // Convert to ms
        duplicateMaxCount: parseInt(automod.duplicateMaxCount),
        antiSpamFlood: automod.antiSpamFlood,
        floodTimeWindow: automod.floodTimeWindow * 1000, // Convert to ms
        floodMaxMessages: parseInt(automod.floodMaxMessages),

        // Content Filters
        antiCaps: automod.antiCaps,
        capsPercentage: parseInt(automod.capsPercentage),
        capsMinLength: parseInt(automod.capsMinLength),
        antiEmoji: automod.antiEmoji,
        maxEmojis: parseInt(automod.maxEmojis),
        antiMention: automod.antiMention,
        maxMentions: parseInt(automod.maxMentions),
        blockEveryoneHere: automod.blockEveryoneHere,

        // Escalation
        violationDecayHours: parseInt(automod.violationDecayHours),
        escalation: {
          enabled: automod.escalation.enabled,
          warn: parseInt(automod.escalation.warn),
          mute1h: parseInt(automod.escalation.mute1h),
          mute24h: parseInt(automod.escalation.mute24h),
          kick: parseInt(automod.escalation.kick),
          ban: parseInt(automod.escalation.ban)
        }
      };

      await dashboardService.updateGuildSettings(guildId, { automod: automodData });

      setMessage({ type: 'success', text: t('dashboard.settingsSaved') });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('dashboard.settingsSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <FaShieldAlt className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('automod.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('automod.description')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutomod({ ...automod, enabled: !automod.enabled })}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
                ${automod.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}
              `}
              role="switch"
              aria-checked={automod.enabled}
            >
              <span
                className={`
                  inline-block h-6 w-6 transform rounded-full bg-white shadow-md
                  transition-transform duration-200
                  ${automod.enabled ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Only show settings if enabled */}
        {automod.enabled && (
          <>
            {/* Link & Invite Filters */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <FaLink className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('automod.linkFilters')}
                </h3>
              </div>
              <div className="space-y-4">
                <ToggleSwitch
                  enabled={automod.blockLinks}
                  onChange={(val) => setAutomod({ ...automod, blockLinks: val })}
                  label={t('automod.blockLinks')}
                  description={t('automod.blockLinksDesc')}
                />
                <ToggleSwitch
                  enabled={automod.blockDiscordInvites}
                  onChange={(val) => setAutomod({ ...automod, blockDiscordInvites: val })}
                  label={t('automod.blockDiscordInvites')}
                  description={t('automod.blockDiscordInvitesDesc')}
                />
              </div>
            </div>

            {/* Spam Detection */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <FaFire className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('automod.spamDetection')}
                </h3>
              </div>
              <div className="space-y-6">
                {/* Duplicate Spam */}
                <div>
                  <ToggleSwitch
                    enabled={automod.antiSpamDuplicate}
                    onChange={(val) => setAutomod({ ...automod, antiSpamDuplicate: val })}
                    label={t('automod.antiDuplicate')}
                    description={t('automod.antiDuplicateDesc')}
                  />
                  {automod.antiSpamDuplicate && (
                    <div className="mt-4 ml-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">{t('automod.duplicateCount')}</label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={automod.duplicateMaxCount}
                          onChange={(e) => setAutomod({ ...automod, duplicateMaxCount: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.timeWindow')} (s)</label>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={automod.duplicateTimeWindow}
                          onChange={(e) => setAutomod({ ...automod, duplicateTimeWindow: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Flood Spam */}
                <div>
                  <ToggleSwitch
                    enabled={automod.antiSpamFlood}
                    onChange={(val) => setAutomod({ ...automod, antiSpamFlood: val })}
                    label={t('automod.antiFlood')}
                    description={t('automod.antiFloodDesc')}
                  />
                  {automod.antiSpamFlood && (
                    <div className="mt-4 ml-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">{t('automod.floodMessages')}</label>
                        <input
                          type="number"
                          min="3"
                          max="20"
                          value={automod.floodMaxMessages}
                          onChange={(e) => setAutomod({ ...automod, floodMaxMessages: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.timeWindow')} (s)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={automod.floodTimeWindow}
                          onChange={(e) => setAutomod({ ...automod, floodTimeWindow: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Filters */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <FaFont className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('automod.contentFilters')}
                </h3>
              </div>
              <div className="space-y-6">
                {/* Caps Spam */}
                <div>
                  <ToggleSwitch
                    enabled={automod.antiCaps}
                    onChange={(val) => setAutomod({ ...automod, antiCaps: val })}
                    label={t('automod.antiCaps')}
                    description={t('automod.antiCapsDesc')}
                  />
                  {automod.antiCaps && (
                    <div className="mt-4 ml-4">
                      <label className="label">
                        {t('automod.capsPercentage')}: {automod.capsPercentage}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={automod.capsPercentage}
                        onChange={(e) => setAutomod({ ...automod, capsPercentage: e.target.value })}
                        className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Emoji Spam */}
                <div>
                  <ToggleSwitch
                    enabled={automod.antiEmoji}
                    onChange={(val) => setAutomod({ ...automod, antiEmoji: val })}
                    label={t('automod.antiEmoji')}
                    description={t('automod.antiEmojiDesc')}
                  />
                  {automod.antiEmoji && (
                    <div className="mt-4 ml-4">
                      <label className="label">
                        {t('automod.maxEmojis')}: {automod.maxEmojis}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={automod.maxEmojis}
                        onChange={(e) => setAutomod({ ...automod, maxEmojis: e.target.value })}
                        className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Mention Spam */}
                <div>
                  <ToggleSwitch
                    enabled={automod.antiMention}
                    onChange={(val) => setAutomod({ ...automod, antiMention: val })}
                    label={t('automod.antiMention')}
                    description={t('automod.antiMentionDesc')}
                  />
                  {automod.antiMention && (
                    <div className="mt-4 ml-4 space-y-4">
                      <div>
                        <label className="label">
                          {t('automod.maxMentions')}: {automod.maxMentions}
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={automod.maxMentions}
                          onChange={(e) => setAutomod({ ...automod, maxMentions: e.target.value })}
                          className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="blockEveryoneHere"
                          checked={automod.blockEveryoneHere}
                          onChange={(e) => setAutomod({ ...automod, blockEveryoneHere: e.target.checked })}
                          className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-dark-600 border-gray-300 dark:border-dark-500 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="blockEveryoneHere" className="text-sm text-gray-700 dark:text-gray-300">
                          {t('automod.blockEveryoneHere')}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banned Words */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <FaBan className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('automod.bannedWords')}
                </h3>
              </div>
              <div>
                <label className="label">
                  {t('automod.wordList')}
                </label>
                <textarea
                  value={automod.bannedWords}
                  onChange={e => setAutomod({ ...automod, bannedWords: e.target.value })}
                  className="input min-h-[120px] resize-y"
                  rows="4"
                  placeholder={t('automod.wordPlaceholder')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('automod.wordsOnList', { count: automod.bannedWords.split(',').filter(w => w.trim()).length })}
                </p>
              </div>
            </div>

            {/* Punishment Escalation */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('automod.escalation')}
                </h3>
              </div>
              <div className="space-y-4">
                <ToggleSwitch
                  enabled={automod.escalation.enabled}
                  onChange={(val) => setAutomod({
                    ...automod,
                    escalation: { ...automod.escalation, enabled: val }
                  })}
                  label={t('automod.escalationEnabled')}
                  description={t('automod.escalationDesc')}
                />

                {automod.escalation.enabled && (
                  <>
                    <div>
                      <label className="label">{t('automod.violationDecay')}</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={automod.violationDecayHours}
                        onChange={(e) => setAutomod({ ...automod, violationDecayHours: e.target.value })}
                        className="input"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('automod.violationDecayDesc')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="label">{t('automod.warnAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automod.escalation.warn}
                          onChange={(e) => setAutomod({
                            ...automod,
                            escalation: { ...automod.escalation, warn: e.target.value }
                          })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.mute1hAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automod.escalation.mute1h}
                          onChange={(e) => setAutomod({
                            ...automod,
                            escalation: { ...automod.escalation, mute1h: e.target.value }
                          })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.mute24hAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automod.escalation.mute24h}
                          onChange={(e) => setAutomod({
                            ...automod,
                            escalation: { ...automod.escalation, mute24h: e.target.value }
                          })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.kickAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automod.escalation.kick}
                          onChange={(e) => setAutomod({
                            ...automod,
                            escalation: { ...automod.escalation, kick: e.target.value }
                          })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">{t('automod.banAt')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automod.escalation.ban}
                          onChange={(e) => setAutomod({
                            ...automod,
                            escalation: { ...automod.escalation, ban: e.target.value }
                          })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {t('automod.escalationExample')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="btn-danger w-full"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('dashboard.saving')}
            </>
          ) : (
            <>
              <FaSave className="w-4 h-4" />
              {t('automod.saveAutomod')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
