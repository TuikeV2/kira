import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaPlay,
  FaPause,
  FaForward,
  FaStop,
  FaSearch,
  FaVolumeUp,
  FaVolumeMute,
  FaTrash,
  FaMusic,
  FaSpinner,
  FaExclamationTriangle
} from 'react-icons/fa';
import { musicService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

function formatDuration(ms) {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const s = seconds % 60;
  const m = minutes % 60;
  if (hours > 0) {
    return `${hours}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MusicPlayer({ guildId, voiceChannels }) {
  const { t } = useTranslation();
  const sT = (key, fallback = '') => {
    const res = t(key);
    return typeof res === 'string' ? res : (fallback || key);
  };

  const [status, setStatus] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedVoiceChannel, setSelectedVoiceChannel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [volumeValue, setVolumeValue] = useState(50);
  const [volumeChanging, setVolumeChanging] = useState(false);
  const [botOffline, setBotOffline] = useState(false);

  const pollRef = useRef(null);
  const volumeTimeoutRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await musicService.getStatus(guildId);
      const data = res.data.data;
      setStatus(data);
      setBotOffline(false);
      if (!volumeChanging) {
        setVolumeValue(data.volume ?? 50);
      }
      if (data.voiceChannelId && !selectedVoiceChannel) {
        setSelectedVoiceChannel(data.voiceChannelId);
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setBotOffline(true);
      }
    }
  }, [guildId, volumeChanging, selectedVoiceChannel]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await musicService.getQueue(guildId);
      setQueue(res.data.data?.tracks || []);
    } catch {
      // ignore
    }
  }, [guildId]);

  // Polling
  useEffect(() => {
    fetchStatus();
    fetchQueue();

    pollRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchStatus();
        fetchQueue();
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchQueue]);

  const handlePlay = async () => {
    if (!searchQuery.trim() || !selectedVoiceChannel) return;
    setSearching(true);
    setError('');
    try {
      await musicService.play(guildId, {
        query: searchQuery.trim(),
        voiceChannelId: selectedVoiceChannel
      });
      setSearchQuery('');
      await fetchStatus();
      await fetchQueue();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to play track';
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  const handlePause = async () => {
    try {
      await musicService.pause(guildId);
      await fetchStatus();
    } catch {
      setError('Failed to toggle pause');
    }
  };

  const handleSkip = async () => {
    try {
      await musicService.skip(guildId);
      setTimeout(() => {
        fetchStatus();
        fetchQueue();
      }, 500);
    } catch {
      setError('Failed to skip');
    }
  };

  const handleStop = async () => {
    try {
      await musicService.stop(guildId);
      setTimeout(() => {
        fetchStatus();
        fetchQueue();
      }, 500);
    } catch {
      setError('Failed to stop');
    }
  };

  const handleVolumeChange = (val) => {
    const v = parseInt(val);
    setVolumeValue(v);
    setVolumeChanging(true);

    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    volumeTimeoutRef.current = setTimeout(async () => {
      try {
        await musicService.setVolume(guildId, v);
      } catch {
        // ignore
      } finally {
        setVolumeChanging(false);
      }
    }, 300);
  };

  const handleRemove = async (index) => {
    try {
      await musicService.removeTrack(guildId, index);
      await fetchQueue();
    } catch {
      setError('Failed to remove track');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handlePlay();
    }
  };

  const isPlaying = status?.playing;
  const isPaused = status?.paused;
  const currentTrack = status?.track;
  const position = status?.position || 0;
  const duration = status?.duration || 0;
  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  if (botOffline) {
    return (
      <div className="card p-6">
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <FaExclamationTriangle className="w-8 h-8 mb-3 text-yellow-500" />
          <p className="font-medium">{sT('music.botOffline', 'Bot is offline')}</p>
          <p className="text-sm mt-1">{sT('music.botOfflineDesc', 'The music bot is not running. Start the bot to use music controls.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Voice Channel */}
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
          <span className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg mr-3">
            <FaMusic className="w-4 h-4" />
          </span>
          {sT('music.playerTitle', 'Music Player')}
        </h3>

        {/* Voice Channel Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {sT('music.selectVoiceChannelPlayer', 'Voice Channel')}
          </label>
          <select
            value={selectedVoiceChannel}
            onChange={e => setSelectedVoiceChannel(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
          >
            <option value="">{sT('music.chooseVoiceChannel', 'Select voice channel...')}</option>
            {(voiceChannels || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={sT('music.searchPlaceholder', 'Search for a song or paste a URL...')}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-colors"
            />
          </div>
          <button
            onClick={handlePlay}
            disabled={!searchQuery.trim() || !selectedVoiceChannel || searching}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-dark-600 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium text-sm"
            title={!selectedVoiceChannel ? sT('music.selectVoiceFirst', 'Select a voice channel first') : ''}
          >
            {searching ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaPlay className="w-3 h-3" />
            )}
            <span>{sT('music.play', 'Play')}</span>
          </button>
        </div>

        {!selectedVoiceChannel && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {sT('music.voiceChannelRequired', 'You must select a voice channel before playing music.')}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Now Playing */}
      <div className="card p-6">
        {currentTrack ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {/* Artwork */}
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-20 h-20 rounded-lg object-cover shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <FaMusic className="w-8 h-8 text-white" />
                </div>
              )}

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white truncate">
                  {currentTrack.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {currentTrack.author}
                </p>
                {currentTrack.requestedBy && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {sT('music.requestedBy', 'Requested by')}: {currentTrack.requestedBy}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {!currentTrack.isStream && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDuration(position)}</span>
                  <span>{currentTrack.durationFormatted || formatDuration(duration)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Pause/Resume */}
                <button
                  onClick={handlePause}
                  className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors shadow-md"
                >
                  {isPaused ? <FaPlay className="w-4 h-4 ml-0.5" /> : <FaPause className="w-4 h-4" />}
                </button>

                {/* Skip */}
                <button
                  onClick={handleSkip}
                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors"
                >
                  <FaForward className="w-4 h-4" />
                </button>

                {/* Stop */}
                <button
                  onClick={handleStop}
                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors"
                >
                  <FaStop className="w-4 h-4" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                {volumeValue === 0 ? (
                  <FaVolumeMute className="w-4 h-4 text-gray-400" />
                ) : (
                  <FaVolumeUp className="w-4 h-4 text-gray-400" />
                )}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volumeValue}
                  onChange={e => handleVolumeChange(e.target.value)}
                  className="w-24 sm:w-32"
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-10 text-right">
                  {volumeValue}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <FaMusic className="w-8 h-8 mb-3 opacity-30" />
            <p className="font-medium">{sT('music.nothingPlaying', 'Nothing playing')}</p>
            <p className="text-sm mt-1">{sT('music.searchToPlay', 'Search for a song above to start playing')}</p>
          </div>
        )}
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            {sT('music.queue', 'Queue')} ({queue.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queue.map((track, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
              >
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-6 text-center">
                  {idx + 1}
                </span>
                {track.artworkUrl ? (
                  <img
                    src={track.artworkUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <FaMusic className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {track.author} - {track.durationFormatted}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title={sT('music.removeFromQueue', 'Remove from queue')}
                >
                  <FaTrash className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
