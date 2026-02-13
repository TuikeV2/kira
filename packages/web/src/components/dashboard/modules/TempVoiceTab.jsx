import React, { useState, useEffect } from 'react';
import { FaMicrophone, FaSave, FaInfoCircle } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function TempVoiceTab({ guildId, channels, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const sT = (key, fallback = '') => {
    const res = t(key);
    return typeof res === 'string' ? res : (fallback || key);
  };

  const [settings, setSettings] = useState({
    tempVoice: {
      enabled: false,
      creatorChannelId: '',
      categoryId: '',
      nameTemplate: '\u{1F50A} Kana\u0142 {user}',
      deleteAfterSeconds: 30,
      userLimit: 0,
      bitrate: 64000
    }
  });

  useEffect(() => {
    if (initialSettings?.tempVoice) {
      setSettings(prev => ({
        ...prev,
        tempVoice: {
          ...prev.tempVoice,
          ...initialSettings.tempVoice
        }
      }));
    }
  }, [initialSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      tempVoice: {
        ...prev.tempVoice,
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dashboardService.updateGuildSettings(guildId, settings);
      setMessage({ type: 'success', text: t('dashboard.settingsSaved') });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: t('dashboard.settingsSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    handleChange('nameTemplate', settings.tempVoice.nameTemplate + variable);
  };

  const voiceChannels = (channels || []).filter(c => c.type === 2);
  const categories = (channels || []).filter(c => c.type === 4);

  const bitrateOptions = [
    { value: 32000, label: '32 kbps' },
    { value: 64000, label: '64 kbps' },
    { value: 96000, label: '96 kbps' },
    { value: 128000, label: '128 kbps' },
    { value: 256000, label: '256 kbps' },
    { value: 384000, label: '384 kbps' }
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveSettings}>
        {/* Main Settings Card */}
        <div className="card p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <span className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg mr-3">
              <FaMicrophone />
            </span>
            {sT('tempVoice.title', 'Temp Channels')}
          </h2>

          <p className="text-gray-600 dark:text-gray-400">
            {sT('tempVoice.description', 'Automatically create temporary voice channels when users join the creator channel.')}
          </p>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
            <div>
              <span className="font-medium text-gray-800 dark:text-white">
                {sT('tempVoice.enabled', 'Temp channels enabled')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sT('tempVoice.enabledDesc', 'Create temporary voice channels when users join the creator channel')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.tempVoice.enabled}
                onChange={e => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Creator Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.creatorChannel', 'Creator channel')}
            </label>
            <select
              value={settings.tempVoice.creatorChannelId}
              onChange={e => handleChange('creatorChannelId', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              <option value="">{sT('tempVoice.selectCreatorChannel', 'Select creator voice channel...')}</option>
              {voiceChannels.map(c => (
                <option key={c.id} value={c.id}>{'\u{1F50A}'} {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('tempVoice.creatorChannelHint', 'Users join this channel to trigger temp channel creation')}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.category', 'Category')}
            </label>
            <select
              value={settings.tempVoice.categoryId}
              onChange={e => handleChange('categoryId', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              <option value="">{sT('tempVoice.selectCategory', 'Select category...')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('tempVoice.categoryHint', 'New temp channels will be created in this category')}
            </p>
          </div>

          {/* Name Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.nameTemplate', 'Channel name template')}
            </label>
            <input
              type="text"
              value={settings.tempVoice.nameTemplate}
              onChange={e => handleChange('nameTemplate', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
              placeholder={'\u{1F50A} Kana\u0142 {user}'}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {['{user}', '{username}', '{count}'].map(variable => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="px-3 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                >
                  {variable}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('tempVoice.nameTemplateHint', '{user} = display name, {username} = username, {count} = channel number')}
            </p>
          </div>

          {/* Delete After Seconds */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.deleteAfter', 'Delete after (seconds)')}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="300"
                step="5"
                value={settings.tempVoice.deleteAfterSeconds}
                onChange={e => handleChange('deleteAfterSeconds', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400 w-16 text-center">
                {settings.tempVoice.deleteAfterSeconds}s
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('tempVoice.deleteAfterHint', '0 = delete immediately when empty, default 30 seconds')}
            </p>
          </div>

          {/* User Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.userLimit', 'User limit')}
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={settings.tempVoice.userLimit}
              onChange={e => handleChange('userLimit', parseInt(e.target.value) || 0)}
              className="w-full max-w-xs px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('tempVoice.userLimitHint', '0 = unlimited')}
            </p>
          </div>

          {/* Bitrate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('tempVoice.bitrate', 'Bitrate')}
            </label>
            <select
              value={settings.tempVoice.bitrate}
              onChange={e => handleChange('bitrate', parseInt(e.target.value))}
              className="w-full max-w-xs px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              {bitrateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-dark-600 flex items-center justify-center space-x-2 transition-colors"
          >
            <FaSave />
            <span>{saving ? sT('dashboard.saving', 'Saving...') : sT('common.saveChanges', 'Save changes')}</span>
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-dark-700 rounded-xl p-6 border border-blue-200 dark:border-dark-600">
        <h3 className="font-bold mb-3 text-blue-900 dark:text-white flex items-center">
          <FaInfoCircle className="mr-2" /> {sT('tempVoice.infoTitle', 'How it works')}
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-gray-400 text-sm">
          <li>{sT('tempVoice.info1', 'Users join the creator channel to get their own temporary voice channel')}</li>
          <li>{sT('tempVoice.info2', 'The bot creates a new voice channel and moves the user into it')}</li>
          <li>{sT('tempVoice.info3', 'When the channel is empty, it is automatically deleted after the configured timeout')}</li>
          <li>{sT('tempVoice.info4', 'The bot needs Manage Channels and Move Members permissions')}</li>
          <li>{sT('tempVoice.info5', 'Created channels inherit permissions from the parent category')}</li>
        </ul>
      </div>
    </div>
  );
}
