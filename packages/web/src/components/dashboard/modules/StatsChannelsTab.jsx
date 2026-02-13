import React, { useState, useEffect } from 'react';
import { FaChartBar, FaUsers, FaRocket, FaCircle, FaRobot, FaHashtag, FaCalendar, FaClock, FaPlus, FaTrash, FaCog, FaEdit, FaVolumeUp, FaSmile, FaStickyNote, FaUserFriends, FaMedal, FaBullseye, FaLayerGroup, FaComments, FaMicrophone, FaMagic, FaCode, FaSave, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function StatsChannelsTab({ guildId, channels, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
    statsChannels: {
      enabled: false,
      categoryId: '',
      categoryName: '📊 Statystyki',
      refreshInterval: 10,
      memberGoal: 1000,
      channelNames: {
        members: 'Członkowie: {count}',
        humans: 'Ludzie: {count}',
        boosts: 'Boosty: {count}',
        boostLevel: 'Boost: {level}',
        online: 'Online: {count}',
        bots: 'Boty: {count}',
        roles: 'Role: {count}',
        channels: 'Kanały: {count}',
        textChannels: 'Tekstowe: {count}',
        voiceChannels: 'Głosowe: {count}',
        categories: 'Kategorie: {count}',
        voiceActive: 'Na voice: {count}',
        emojis: 'Emoji: {count}',
        stickers: 'Naklejki: {count}',
        goal: '{count}/{goal} członków',
        date: '📅 {date}',
        time: '🕐 {time}'
      },
      membersChannelId: '',
      humansChannelId: '',
      boostsChannelId: '',
      boostLevelChannelId: '',
      rolesChannelId: '',
      channelsChannelId: '',
      textChannelsChannelId: '',
      voiceChannelsChannelId: '',
      categoriesChannelId: '',
      onlineChannelId: '',
      voiceActiveChannelId: '',
      botsChannelId: '',
      emojisChannelId: '',
      stickersChannelId: '',
      goalChannelId: '',
      dateChannelId: '',
      timeChannelId: ''
    }
  });

  const [enabledChannels, setEnabledChannels] = useState({
    members: true,
    humans: false,
    boosts: true,
    boostLevel: false,
    online: true,
    bots: true,
    roles: true,
    channels: true,
    textChannels: false,
    voiceChannels: false,
    categories: false,
    voiceActive: false,
    emojis: false,
    stickers: false,
    goal: false,
    date: false,
    time: false
  });

  // Custom Stats Channels state
  const [customChannels, setCustomChannels] = useState([]);
  const [availableVariables, setAvailableVariables] = useState({
    // Fallback zmiennych - użyte jeśli API nie zwróci danych
    '{members}': 'Wszyscy członkowie serwera',
    '{humans}': 'Ludzie (bez botów)',
    '{bots}': 'Boty',
    '{online}': 'Użytkownicy online',
    '{offline}': 'Użytkownicy offline',
    '{voice}': 'Użytkownicy na kanałach głosowych',
    '{roles}': 'Liczba ról',
    '{channels}': 'Wszystkie kanały',
    '{boosts}': 'Liczba boostów',
    '{boostTier}': 'Nazwa poziomu boost',
    '{emojis}': 'Liczba emoji',
    '{date}': 'Aktualna data',
    '{time}': 'Aktualny czas'
  });
  const [newChannelTemplate, setNewChannelTemplate] = useState('');
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState('');
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    if (initialSettings?.statsChannels) {
      setSettings(prev => ({
        ...prev,
        statsChannels: {
          ...prev.statsChannels,
          ...initialSettings.statsChannels,
          channelNames: {
            ...prev.statsChannels.channelNames,
            ...(initialSettings.statsChannels.channelNames || {})
          }
        }
      }));

      // Ustaw enabled channels na podstawie istniejących ID
      const sc = initialSettings.statsChannels;
      setEnabledChannels({
        members: !!sc.membersChannelId,
        humans: !!sc.humansChannelId,
        boosts: !!sc.boostsChannelId,
        boostLevel: !!sc.boostLevelChannelId,
        online: !!sc.onlineChannelId,
        bots: !!sc.botsChannelId,
        roles: !!sc.rolesChannelId,
        channels: !!sc.channelsChannelId,
        textChannels: !!sc.textChannelsChannelId,
        voiceChannels: !!sc.voiceChannelsChannelId,
        categories: !!sc.categoriesChannelId,
        voiceActive: !!sc.voiceActiveChannelId,
        emojis: !!sc.emojisChannelId,
        stickers: !!sc.stickersChannelId,
        goal: !!sc.goalChannelId,
        date: !!sc.dateChannelId,
        time: !!sc.timeChannelId
      });
    }

    // Load custom stats from initialSettings
    if (initialSettings?.customStatsChannels) {
      setCustomChannels(initialSettings.customStatsChannels);
    }
  }, [initialSettings]);

  // Pobierz dostępne zmienne i odśwież custom channels
  const loadCustomStats = async () => {
    try {
      const response = await dashboardService.getCustomStatsChannels(guildId);
      if (response.data?.data) {
        setCustomChannels(response.data.data.channels || []);
        if (response.data.data.availableVariables) {
          setAvailableVariables(response.data.data.availableVariables);
        }
      }
    } catch (error) {
      // fetch error handled silently
    }
  };

  useEffect(() => {
    loadCustomStats();
  }, [guildId, initialSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      statsChannels: {
        ...prev.statsChannels,
        [field]: value
      }
    }));
  };

  const handleChannelNameChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      statsChannels: {
        ...prev.statsChannels,
        channelNames: {
          ...prev.statsChannels.channelNames,
          [key]: value
        }
      }
    }));
  };

  const handleEnabledChange = (key, value) => {
    setEnabledChannels(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateChannels = async () => {
    setCreating(true);
    try {
      const enabledList = Object.entries(enabledChannels)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      await dashboardService.createStatsChannels(guildId, {
        categoryName: settings.statsChannels.categoryName,
        channelNames: settings.statsChannels.channelNames,
        enabledChannels: enabledList,
        refreshInterval: settings.statsChannels.refreshInterval
      });

      setMessage({ type: 'success', text: 'Kanały statystyk zostały utworzone!' });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Nie udało się utworzyć kanałów' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChannels = async () => {
    if (!confirm('Czy na pewno chcesz usunąć wszystkie kanały statystyk?')) return;

    setDeleting(true);
    try {
      await dashboardService.deleteStatsChannels(guildId);
      setMessage({ type: 'success', text: 'Kanały statystyk zostały usunięte!' });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: 'Nie udało się usunąć kanałów' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dashboardService.updateGuildSettings(guildId, settings);
      setMessage({ type: 'success', text: 'Ustawienia zapisane pomyślnie!' });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: 'Nie udało się zapisać ustawień' });
    } finally {
      setSaving(false);
    }
  };

  // Custom Stats Channel functions
  const handleCreateCustomChannel = async () => {
    if (!newChannelTemplate.trim()) {
      setMessage({ type: 'error', text: 'Wprowadź szablon nazwy kanału' });
      return;
    }

    // Sprawdź czy szablon zawiera przynajmniej jedną zmienną
    const hasVariable = Object.keys(availableVariables).some(v => newChannelTemplate.includes(v));
    if (!hasVariable) {
      setMessage({ type: 'error', text: 'Szablon musi zawierać przynajmniej jedną zmienną, np. {members}, {online}' });
      return;
    }

    setCreatingCustom(true);
    try {
      const response = await dashboardService.createCustomStatsChannel(guildId, {
        nameTemplate: newChannelTemplate
      });

      if (response.data?.data?.channel) {
        setCustomChannels(prev => [...prev, response.data.data.channel]);
      }
      setNewChannelTemplate('');
      setMessage({ type: 'success', text: 'Kanał statystyk utworzony!' });
      // Odśwież dane z serwera
      if (onSave) onSave();
      await loadCustomStats();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Nie udało się utworzyć kanału' });
    } finally {
      setCreatingCustom(false);
    }
  };

  const handleUpdateCustomChannel = async (channelId) => {
    if (!editingTemplate.trim()) {
      setMessage({ type: 'error', text: 'Wprowadź szablon nazwy kanału' });
      return;
    }

    const hasVariable = Object.keys(availableVariables).some(v => editingTemplate.includes(v));
    if (!hasVariable) {
      setMessage({ type: 'error', text: 'Szablon musi zawierać przynajmniej jedną zmienną' });
      return;
    }

    try {
      await dashboardService.updateCustomStatsChannel(guildId, channelId, {
        nameTemplate: editingTemplate
      });

      setCustomChannels(prev => prev.map(ch =>
        ch.id === channelId ? { ...ch, nameTemplate: editingTemplate } : ch
      ));
      setEditingChannelId(null);
      setEditingTemplate('');
      setMessage({ type: 'success', text: 'Kanał zaktualizowany!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Nie udało się zaktualizować kanału' });
    }
  };

  const handleDeleteCustomChannel = async (channelId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten kanał statystyk?')) return;

    try {
      await dashboardService.deleteCustomStatsChannel(guildId, channelId);
      setCustomChannels(prev => prev.filter(ch => ch.id !== channelId));
      setMessage({ type: 'success', text: 'Kanał usunięty!' });
      if (onSave) onSave();
    } catch (error) {
      setMessage({ type: 'error', text: 'Nie udało się usunąć kanału' });
    }
  };

  const insertVariable = (variable, targetSetter, currentValue) => {
    targetSetter(currentValue + variable);
  };

  // Filter only voice channels
  const voiceChannels = channels.filter(c => c.type === 2);

  const statsOptions = [
    // Członkowie
    { id: 'membersChannelId', key: 'members', label: 'Wszyscy członkowie', icon: FaUsers, placeholder: '{count}', category: 'members' },
    { id: 'humansChannelId', key: 'humans', label: 'Ludzie (bez botów)', icon: FaUserFriends, placeholder: '{count}', category: 'members' },
    { id: 'botsChannelId', key: 'bots', label: 'Boty', icon: FaRobot, placeholder: '{count}', category: 'members' },
    { id: 'onlineChannelId', key: 'online', label: 'Online', icon: FaCircle, placeholder: '{count}', category: 'members' },
    { id: 'voiceActiveChannelId', key: 'voiceActive', label: 'Na kanałach głosowych', icon: FaMicrophone, placeholder: '{count}', category: 'members' },
    { id: 'goalChannelId', key: 'goal', label: 'Cel członków', icon: FaBullseye, placeholder: '{count}/{goal}', category: 'members' },

    // Serwer
    { id: 'boostsChannelId', key: 'boosts', label: 'Liczba boostów', icon: FaRocket, placeholder: '{count}', category: 'server' },
    { id: 'boostLevelChannelId', key: 'boostLevel', label: 'Poziom boost', icon: FaMedal, placeholder: '{level}', category: 'server' },
    { id: 'rolesChannelId', key: 'roles', label: 'Role', icon: FaHashtag, placeholder: '{count}', category: 'server' },
    { id: 'emojisChannelId', key: 'emojis', label: 'Emoji', icon: FaSmile, placeholder: '{count}', category: 'server' },
    { id: 'stickersChannelId', key: 'stickers', label: 'Naklejki', icon: FaStickyNote, placeholder: '{count}', category: 'server' },

    // Kanały
    { id: 'channelsChannelId', key: 'channels', label: 'Wszystkie kanały', icon: FaLayerGroup, placeholder: '{count}', category: 'channels' },
    { id: 'textChannelsChannelId', key: 'textChannels', label: 'Kanały tekstowe', icon: FaComments, placeholder: '{count}', category: 'channels' },
    { id: 'voiceChannelsChannelId', key: 'voiceChannels', label: 'Kanały głosowe', icon: FaVolumeUp, placeholder: '{count}', category: 'channels' },
    { id: 'categoriesChannelId', key: 'categories', label: 'Kategorie', icon: FaLayerGroup, placeholder: '{count}', category: 'channels' },

    // Czas
    { id: 'dateChannelId', key: 'date', label: 'Aktualna data', icon: FaCalendar, placeholder: '{date}', category: 'time' },
    { id: 'timeChannelId', key: 'time', label: 'Aktualna godzina', icon: FaClock, placeholder: '{time}', category: 'time' }
  ];

  const categoryLabels = {
    members: 'Członkowie',
    server: 'Serwer',
    channels: 'Kanały',
    time: 'Data i czas'
  };

  const isConfigured = settings.statsChannels.categoryId;

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <span className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg mr-3"><FaChartBar /></span>
          Kanały Statystyk
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          System automatycznie tworzy kategorię z kanałami głosowymi, które wyświetlają statystyki serwera.
          Nazwy kanałów są aktualizowane w ustawionym interwale czasowym.
        </p>

        {!isConfigured ? (
          /* Tworzenie nowych kanałów */
          <div className="space-y-6">
            {/* Nazwa kategorii */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nazwa kategorii
              </label>
              <input
                type="text"
                value={settings.statsChannels.categoryName}
                onChange={e => handleChange('categoryName', e.target.value)}
                className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-3 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="📊 Statystyki"
              />
            </div>

            {/* Interwał odświeżania */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interwał odświeżania (minuty)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={settings.statsChannels.refreshInterval}
                  onChange={e => handleChange('refreshInterval', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 w-16 text-center">
                  {settings.statsChannels.refreshInterval} min
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimalnie 5 minut (limit Discord API)
              </p>
            </div>

            {/* Cel członków - pokazuj tylko gdy goal jest włączony */}
            {enabledChannels.goal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cel liczby członków
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.statsChannels.memberGoal || 1000}
                  onChange={e => handleChange('memberGoal', parseInt(e.target.value) || 1000)}
                  className="w-full max-w-xs border border-gray-300 dark:border-dark-600 rounded-lg p-3 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  placeholder="np. 1000"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Wyświetli się jako: {settings.statsChannels.channelNames.goal?.replace('{count}', '150').replace('{goal}', settings.statsChannels.memberGoal || 1000)}
                </p>
              </div>
            )}

            {/* Wybór kanałów do utworzenia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Wybierz kanały do utworzenia
              </label>

              {Object.entries(categoryLabels).map(([categoryKey, categoryLabel]) => (
                <div key={categoryKey} className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                    {categoryLabel}
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {statsOptions.filter(o => o.category === categoryKey).map(option => (
                      <label
                        key={option.key}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          enabledChannels[option.key]
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600'
                            : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={enabledChannels[option.key]}
                          onChange={e => handleEnabledChange(option.key, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded mr-3"
                        />
                        <option.icon className={`mr-2 flex-shrink-0 ${enabledChannels[option.key] ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className={`text-sm ${enabledChannels[option.key] ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Zaawansowane - nazwy kanałów */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <FaCog className="mr-2" />
                {showAdvanced ? 'Ukryj' : 'Pokaż'} zaawansowane ustawienia nazw
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Dostosuj format nazw kanałów. Dostępne placeholdery:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-xs text-gray-800 dark:text-gray-200">{'{count}'}</code>
                    <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-xs text-gray-800 dark:text-gray-200">{'{level}'}</code>
                    <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-xs text-gray-800 dark:text-gray-200">{'{goal}'}</code>
                    <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-xs text-gray-800 dark:text-gray-200">{'{date}'}</code>
                    <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-xs text-gray-800 dark:text-gray-200">{'{time}'}</code>
                  </div>
                  {statsOptions.filter(o => enabledChannels[o.key]).map(option => (
                    <div key={option.key} className="flex items-center space-x-3">
                      <option.icon className="text-indigo-500 dark:text-indigo-400 w-5 flex-shrink-0" />
                      <input
                        type="text"
                        value={settings.statsChannels.channelNames[option.key]}
                        onChange={e => handleChannelNameChange(option.key, e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 text-sm bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                        placeholder={`np. ${option.label}: ${option.placeholder}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Przycisk tworzenia */}
            <button
              type="button"
              onClick={handleCreateChannels}
              disabled={creating || Object.values(enabledChannels).every(v => !v)}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-dark-600 flex items-center justify-center space-x-2"
            >
              <FaPlus />
              <span>{creating ? 'Tworzenie...' : 'Utwórz kanały statystyk'}</span>
            </button>
          </div>
        ) : (
          /* Zarządzanie istniejącymi kanałami */
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-green-800 dark:text-green-300 font-medium">Kanały statystyk są aktywne</span>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Odświeżanie co {settings.statsChannels.refreshInterval || 10} minut
                </p>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.statsChannels.enabled}
                  onChange={e => handleChange('enabled', e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded"
                />
                <span className="font-medium text-gray-800 dark:text-white">Włączone</span>
              </label>
            </div>

            {/* Interwał odświeżania */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interwał odświeżania (minuty)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={settings.statsChannels.refreshInterval || 10}
                  onChange={e => handleChange('refreshInterval', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 w-16 text-center">
                  {settings.statsChannels.refreshInterval || 10} min
                </span>
              </div>
            </div>

            {/* Cel członków - tylko gdy goalChannelId istnieje */}
            {settings.statsChannels.goalChannelId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cel liczby członków
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.statsChannels.memberGoal || 1000}
                  onChange={e => handleChange('memberGoal', parseInt(e.target.value) || 1000)}
                  className="w-full max-w-xs border border-gray-300 dark:border-dark-600 rounded-lg p-3 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  placeholder="np. 1000"
                />
              </div>
            )}

            {/* Edycja nazw kanałów */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <FaEdit className="mr-2" /> Edytuj nazwy kanałów
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {statsOptions.map(option => {
                  const channelId = settings.statsChannels[option.id];
                  if (!channelId) return null;

                  return (
                    <div key={option.id} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700">
                      <div className="flex items-center mb-2">
                        <option.icon className="text-indigo-500 dark:text-indigo-400 mr-2" />
                        <span className="font-medium text-gray-800 dark:text-white">{option.label}</span>
                      </div>
                      <input
                        type="text"
                        value={settings.statsChannels.channelNames?.[option.key] || ''}
                        onChange={e => handleChannelNameChange(option.key, e.target.value)}
                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 text-sm mb-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                        placeholder={`Format nazwy kanału`}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Użyj <code className="bg-gray-200 dark:bg-dark-600 px-1 rounded text-gray-800 dark:text-gray-200">{option.placeholder}</code> jako placeholder
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ręczne przypisanie kanałów (opcjonalne) */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FaCog className="mr-2" />
                {showAdvanced ? 'Ukryj' : 'Pokaż'} ręczne przypisanie kanałów
              </button>

              {showAdvanced && (
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  {statsOptions.map(option => (
                    <div key={option.id} className="border border-gray-200 dark:border-dark-600 rounded-lg p-3 bg-white dark:bg-dark-700">
                      <div className="flex items-center mb-2">
                        <option.icon className="text-indigo-500 dark:text-indigo-400 mr-2" />
                        <span className="text-sm font-medium text-gray-800 dark:text-white">{option.label}</span>
                      </div>
                      <select
                        value={settings.statsChannels[option.id] || ''}
                        onChange={e => handleChange(option.id, e.target.value)}
                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Wyłączony --</option>
                        {voiceChannels.map(c => (
                          <option key={c.id} value={c.id}>🔊 {c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Przyciski */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-dark-600"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
              <button
                type="button"
                onClick={handleDeleteChannels}
                disabled={deleting}
                className="px-6 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 dark:disabled:bg-dark-600 flex items-center space-x-2"
              >
                <FaTrash />
                <span>{deleting ? 'Usuwanie...' : 'Usuń kanały'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Custom Stats Channels */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <span className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg mr-3">
            <FaMagic />
          </span>
          Własne Kanały Statystyk
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Twórz własne kanały statystyk z dowolnymi kombinacjami zmiennych.
          Np. <code className="bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded text-sm">👥 Online: {'{online}'}/{'{members}'}</code>
        </p>

        {/* Dostępne zmienne */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-2"
          >
            <FaCode className="mr-2" />
            {showVariables ? 'Ukryj' : 'Pokaż'} dostępne zmienne ({Object.keys(availableVariables).length})
          </button>

          {showVariables && (
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border border-gray-200 dark:border-dark-600">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(availableVariables).map(([variable, description]) => (
                  <div
                    key={variable}
                    className="group relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (editingChannelId) {
                          setEditingTemplate(prev => prev + variable);
                        } else {
                          setNewChannelTemplate(prev => prev + variable);
                        }
                      }}
                      className="w-full text-left bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 rounded px-2 py-1.5 text-xs font-mono hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      {variable}
                    </button>
                    <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nowy kanał */}
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-3 flex items-center">
            <FaPlus className="mr-2" /> Utwórz nowy kanał
          </h4>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={newChannelTemplate}
              onChange={e => setNewChannelTemplate(e.target.value)}
              placeholder="np. 👥 Online: {online}/{members}"
              className="flex-1 border border-purple-300 dark:border-purple-700 rounded-lg p-3 bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button
              type="button"
              onClick={handleCreateCustomChannel}
              disabled={creatingCustom || !newChannelTemplate.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-dark-600 flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <FaPlus />
              <span>{creatingCustom ? 'Tworzenie...' : 'Utwórz'}</span>
            </button>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
            Kliknij zmienną powyżej, aby ją wstawić do pola
          </p>
        </div>

        {/* Lista istniejących custom channels */}
        {customChannels.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <FaVolumeUp className="mr-2 text-purple-500" />
              Twoje kanały ({customChannels.length})
            </h4>
            {customChannels.map(channel => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600"
              >
                {editingChannelId === channel.id ? (
                  <div className="flex-1 flex items-center space-x-3">
                    <input
                      type="text"
                      value={editingTemplate}
                      onChange={e => setEditingTemplate(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-dark-500 rounded p-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCustomChannel(channel.id)}
                      className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Zapisz"
                    >
                      <FaSave />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingChannelId(null); setEditingTemplate(''); }}
                      className="p-2 text-gray-600 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                      title="Anuluj"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <FaVolumeUp className="text-purple-500" />
                      <code className="bg-gray-200 dark:bg-dark-600 px-3 py-1 rounded text-sm text-gray-800 dark:text-gray-200">
                        {channel.nameTemplate}
                      </code>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => { setEditingChannelId(channel.id); setEditingTemplate(channel.nameTemplate); }}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        title="Edytuj"
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomChannel(channel.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Usuń"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FaMagic className="mx-auto text-4xl mb-3 opacity-30" />
            <p>Nie masz jeszcze żadnych własnych kanałów statystyk.</p>
            <p className="text-sm">Użyj formularza powyżej, aby utworzyć pierwszy kanał.</p>
          </div>
        )}
      </div>

      {/* Informacje */}
      <div className="bg-blue-50 dark:bg-dark-700 rounded-xl p-6 border border-blue-200 dark:border-dark-600">
        <h3 className="font-bold mb-3 text-blue-900 dark:text-white flex items-center">
          <FaInfoCircle className="mr-2" /> Informacje
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-gray-400 text-sm">
          <li>Kanały statystyk to kanały głosowe, do których użytkownicy nie mogą dołączyć</li>
          <li>Nazwy kanałów są aktualizowane automatycznie w ustawionym interwale</li>
          <li>Discord limituje zmiany nazw kanałów - minimalny interwał to 5 minut</li>
          <li>Dla kanałów daty i godziny używana jest strefa czasowa Europe/Warsaw</li>
          <li>Bot musi mieć uprawnienie "Zarządzaj kanałami" na serwerze</li>
          <li><strong>Własne kanały</strong> pozwalają łączyć wiele zmiennych w jednej nazwie</li>
        </ul>
      </div>
    </div>
  );
}
