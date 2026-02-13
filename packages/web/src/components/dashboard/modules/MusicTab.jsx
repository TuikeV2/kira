import React, { useState, useEffect } from 'react';
import { FaMusic, FaSave, FaInfoCircle } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';
import MusicPlayer from './MusicPlayer';

export default function MusicTab({ guildId, channels, roles, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const sT = (key, fallback = '') => {
    const res = t(key);
    return typeof res === 'string' ? res : (fallback || key);
  };

  const [settings, setSettings] = useState({
    music: {
      enabled: false,
      twentyFourSeven: false,
      voiceChannelId: '',
      requestChannelId: '',
      defaultVolume: 50,
      djRoleId: '',
      maxQueueSize: 100,
      announceNowPlaying: true,
      defaultPlaylist: ''
    }
  });

  useEffect(() => {
    if (initialSettings?.music) {
      setSettings(prev => ({
        ...prev,
        music: {
          ...prev.music,
          ...initialSettings.music
        }
      }));
    }
  }, [initialSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      music: {
        ...prev.music,
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

  const voiceChannels = (channels || []).filter(c => c.type === 2);
  const textChannels = (channels || []).filter(c => c.type === 0);
  const allRoles = (roles || []).filter(r => r.name !== '@everyone');

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveSettings}>
        {/* Main Settings Card */}
        <div className="card p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <span className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg mr-3">
              <FaMusic />
            </span>
            {sT('music.title', 'Music')}
          </h2>

          <p className="text-gray-600 dark:text-gray-400">
            {sT('music.description', 'Configure the music bot and 24/7 mode')}
          </p>

          {/* Enable Music Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
            <div>
              <span className="font-medium text-gray-800 dark:text-white">
                {sT('music.enabled', 'Music system enabled')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sT('music.enabledDesc', 'Enable music module with text channel requests')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.music.enabled}
                onChange={e => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* 24/7 Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
            <div>
              <span className="font-medium text-gray-800 dark:text-white">
                {sT('music.twentyFourSeven', '24/7 Mode')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sT('music.twentyFourSevenDesc', 'Bot stays in voice channel and waits for requests')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.music.twentyFourSeven}
                onChange={e => handleChange('twentyFourSeven', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Voice Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.voiceChannel', 'Voice Channel')}
            </label>
            <select
              value={settings.music.voiceChannelId}
              onChange={e => handleChange('voiceChannelId', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              <option value="">{sT('music.selectVoiceChannel', 'Select voice channel...')}</option>
              {voiceChannels.map(c => (
                <option key={c.id} value={c.id}>{'\u{1F50A}'} {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('music.voiceChannelHint', 'Voice channel where the bot will play music')}
            </p>
          </div>

          {/* Request Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.requestChannel', 'Request Channel')}
            </label>
            <select
              value={settings.music.requestChannelId}
              onChange={e => handleChange('requestChannelId', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              <option value="">{sT('music.selectRequestChannel', 'Select text channel for requests...')}</option>
              {textChannels.map(c => (
                <option key={c.id} value={c.id}># {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('music.requestChannelDesc', 'Text channel where users type song names')}
            </p>
          </div>

          {/* Default Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.defaultVolume', 'Default Volume')}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.music.defaultVolume}
                onChange={e => handleChange('defaultVolume', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400 w-16 text-center">
                {settings.music.defaultVolume}%
              </span>
            </div>
          </div>

          {/* DJ Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.djRole', 'DJ Role')}
            </label>
            <select
              value={settings.music.djRoleId}
              onChange={e => handleChange('djRoleId', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            >
              <option value="">{sT('music.noDjRole', 'No DJ role (everyone can control)')}</option>
              {allRoles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('music.djRoleDesc', 'Role that can control playback (skip, stop). Empty = everyone')}
            </p>
          </div>

          {/* Max Queue Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.maxQueueSize', 'Max songs in queue')}
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={settings.music.maxQueueSize}
              onChange={e => handleChange('maxQueueSize', parseInt(e.target.value) || 100)}
              className="w-full max-w-xs px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
              placeholder="100"
            />
          </div>

          {/* Announce Now Playing Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
            <div>
              <span className="font-medium text-gray-800 dark:text-white">
                {sT('music.announceNowPlaying', 'Announce now playing')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sT('music.announceNowPlayingDesc', 'Send embed with currently playing track info')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.music.announceNowPlaying}
                onChange={e => handleChange('announceNowPlaying', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Default Playlist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sT('music.defaultPlaylist', 'Default Playlist')}
            </label>
            <input
              type="text"
              value={settings.music.defaultPlaylist}
              onChange={e => handleChange('defaultPlaylist', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
              placeholder={sT('music.defaultPlaylistPlaceholder', 'https://www.youtube.com/playlist?list=...')}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {sT('music.defaultPlaylistDesc', 'Playlist URL (YouTube/Spotify) played when no requests in 24/7 mode')}
            </p>
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
          <FaInfoCircle className="mr-2" /> {sT('music.infoTitle', 'How it works')}
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-gray-400 text-sm">
          <li>{sT('music.info1', 'Set up the request channel - users type song names there to queue music')}</li>
          <li>{sT('music.info2', 'Bot searches YouTube, Spotify, and SoundCloud for the song')}</li>
          <li>{sT('music.info3', 'In 24/7 mode, bot stays in the voice channel even when the queue is empty')}</li>
          <li>{sT('music.info4', 'Default playlist plays automatically when there are no user requests (24/7)')}</li>
          <li>{sT('music.info5', 'Bot needs Connect and Speak permissions in the voice channel')}</li>
        </ul>
      </div>

      {/* Music Player - visible when music is enabled */}
      {settings.music.enabled && (
        <MusicPlayer guildId={guildId} voiceChannels={voiceChannels} />
      )}
    </div>
  );
}
