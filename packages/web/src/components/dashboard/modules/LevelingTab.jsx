import React, { useState, useEffect } from 'react';
import { FaTrophy, FaPlus, FaTrash, FaMicrophone, FaHashtag, FaUserShield, FaTimes, FaPercent } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import DiscordPreview from '../DiscordPreview';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function LevelingTab({ guildId, channels, roles, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [settings, setSettings] = useState({
    // General
    levelingEnabled: false,
    levelingChannelId: '',
    levelingMessage: '{user} osiagnol poziom {level}!',
    levelingImage: '',

    // XP Settings
    xpPerMessage: 15,
    xpPerMessageMin: 10,
    xpPerMessageMax: 25,
    xpRandomEnabled: false,
    levelingCooldown: 60,

    // Voice XP
    voiceXpEnabled: false,
    voiceXpPerMinute: 5,
    voiceXpRequireUnmuted: true,
    voiceXpRequireVideo: false,
    voiceXpIgnoreAfk: true,

    // Multipliers
    xpMultiplierEnabled: false,
    channelMultipliers: [], // { channelId, multiplier }
    roleMultipliers: [], // { roleId, multiplier }
    weekendMultiplier: 1.0,

    // Ignored
    levelingIgnoredChannels: [],
    levelingNoXpRoles: [], // roles that don't earn XP (e.g. muted)

    // Level Roles
    levelRoles: [],
    levelRolesStack: true, // true = keep all roles, false = only highest
    levelRolesRemoveLower: false, // remove lower level roles when gaining new

    // Announcements
    levelingAnnounceDm: false,
    levelingMilestones: [], // levels that get special announcement
    levelingMilestoneMessage: '',
  });

  // New items to add
  const [newRoleLevel, setNewRoleLevel] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newIgnoredChannel, setNewIgnoredChannel] = useState('');
  const [newNoXpRole, setNewNoXpRole] = useState('');
  const [newChannelMultiplier, setNewChannelMultiplier] = useState({ channelId: '', multiplier: 1.5 });
  const [newRoleMultiplier, setNewRoleMultiplier] = useState({ roleId: '', multiplier: 1.5 });
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        ...prev,
        levelingEnabled: initialSettings.levelingEnabled || false,
        levelingChannelId: initialSettings.levelingChannelId || '',
        levelingMessage: initialSettings.levelingMessage || '{user} osiagnol poziom {level}!',
        levelingImage: initialSettings.levelingImage || '',
        xpPerMessage: initialSettings.xpPerMessage || 15,
        xpPerMessageMin: initialSettings.xpPerMessageMin || 10,
        xpPerMessageMax: initialSettings.xpPerMessageMax || 25,
        xpRandomEnabled: initialSettings.xpRandomEnabled || false,
        levelingCooldown: initialSettings.levelingCooldown || 60,
        voiceXpEnabled: initialSettings.voiceXpEnabled || false,
        voiceXpPerMinute: initialSettings.voiceXpPerMinute || 5,
        voiceXpRequireUnmuted: initialSettings.voiceXpRequireUnmuted !== false,
        voiceXpRequireVideo: initialSettings.voiceXpRequireVideo || false,
        voiceXpIgnoreAfk: initialSettings.voiceXpIgnoreAfk !== false,
        xpMultiplierEnabled: initialSettings.xpMultiplierEnabled || false,
        channelMultipliers: initialSettings.channelMultipliers || [],
        roleMultipliers: initialSettings.roleMultipliers || [],
        weekendMultiplier: initialSettings.weekendMultiplier || 1.0,
        levelingIgnoredChannels: initialSettings.levelingIgnoredChannels || [],
        levelingNoXpRoles: initialSettings.levelingNoXpRoles || [],
        levelRoles: initialSettings.levelRoles || [],
        levelRolesStack: initialSettings.levelRolesStack !== false,
        levelRolesRemoveLower: initialSettings.levelRolesRemoveLower || false,
        levelingAnnounceDm: initialSettings.levelingAnnounceDm || false,
        levelingMilestones: initialSettings.levelingMilestones || [],
        levelingMilestoneMessage: initialSettings.levelingMilestoneMessage || '',
      }));
    }
  }, [initialSettings]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, levelingImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Level Roles
  const handleAddRole = () => {
    const level = parseInt(newRoleLevel);
    if (!level || level < 1 || !newRoleId) {
      setMessage({ type: 'error', text: 'Wybierz poprawny poziom i role' });
      return;
    }
    if (settings.levelRoles.some(lr => lr.level === level)) {
      setMessage({ type: 'error', text: 'Rola dla tego poziomu juz istnieje' });
      return;
    }
    const newLevelRoles = [...settings.levelRoles, { level, roleId: newRoleId }];
    newLevelRoles.sort((a, b) => a.level - b.level);
    setSettings({ ...settings, levelRoles: newLevelRoles });
    setNewRoleLevel('');
    setNewRoleId('');
  };

  const handleRemoveRole = (level) => {
    setSettings({
      ...settings,
      levelRoles: settings.levelRoles.filter(lr => lr.level !== level)
    });
  };

  // Ignored Channels
  const handleAddIgnoredChannel = () => {
    if (!newIgnoredChannel || settings.levelingIgnoredChannels.includes(newIgnoredChannel)) return;
    setSettings({
      ...settings,
      levelingIgnoredChannels: [...settings.levelingIgnoredChannels, newIgnoredChannel]
    });
    setNewIgnoredChannel('');
  };

  const handleRemoveIgnoredChannel = (channelId) => {
    setSettings({
      ...settings,
      levelingIgnoredChannels: settings.levelingIgnoredChannels.filter(c => c !== channelId)
    });
  };

  // No XP Roles
  const handleAddNoXpRole = () => {
    if (!newNoXpRole || settings.levelingNoXpRoles.includes(newNoXpRole)) return;
    setSettings({
      ...settings,
      levelingNoXpRoles: [...settings.levelingNoXpRoles, newNoXpRole]
    });
    setNewNoXpRole('');
  };

  const handleRemoveNoXpRole = (roleId) => {
    setSettings({
      ...settings,
      levelingNoXpRoles: settings.levelingNoXpRoles.filter(r => r !== roleId)
    });
  };

  // Channel Multipliers
  const handleAddChannelMultiplier = () => {
    if (!newChannelMultiplier.channelId || settings.channelMultipliers.some(m => m.channelId === newChannelMultiplier.channelId)) return;
    setSettings({
      ...settings,
      channelMultipliers: [...settings.channelMultipliers, { ...newChannelMultiplier }]
    });
    setNewChannelMultiplier({ channelId: '', multiplier: 1.5 });
  };

  const handleRemoveChannelMultiplier = (channelId) => {
    setSettings({
      ...settings,
      channelMultipliers: settings.channelMultipliers.filter(m => m.channelId !== channelId)
    });
  };

  // Role Multipliers
  const handleAddRoleMultiplier = () => {
    if (!newRoleMultiplier.roleId || settings.roleMultipliers.some(m => m.roleId === newRoleMultiplier.roleId)) return;
    setSettings({
      ...settings,
      roleMultipliers: [...settings.roleMultipliers, { ...newRoleMultiplier }]
    });
    setNewRoleMultiplier({ roleId: '', multiplier: 1.5 });
  };

  const handleRemoveRoleMultiplier = (roleId) => {
    setSettings({
      ...settings,
      roleMultipliers: settings.roleMultipliers.filter(m => m.roleId !== roleId)
    });
  };

  // Milestones
  const handleAddMilestone = () => {
    const level = parseInt(newMilestone);
    if (!level || level < 1 || settings.levelingMilestones.includes(level)) return;
    const newMilestones = [...settings.levelingMilestones, level].sort((a, b) => a - b);
    setSettings({ ...settings, levelingMilestones: newMilestones });
    setNewMilestone('');
  };

  const handleRemoveMilestone = (level) => {
    setSettings({
      ...settings,
      levelingMilestones: settings.levelingMilestones.filter(l => l !== level)
    });
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

  const getChannelName = (id) => (channels || []).find(c => c.id === id)?.name || 'unknown-channel';
  const getRoleName = (id) => (roles || []).find(r => r.id === id)?.name || 'Unknown Role';

  // Filter roles and channels
  const selectableRoles = (roles || []).filter(r => r.name !== '@everyone' && !r.managed);
  const textChannels = (channels || []).filter(c => c.type === 0);
  const voiceChannels = (channels || []).filter(c => c.type === 2);

  const subTabs = [
    { id: 'general', label: 'Ogolne', icon: FaTrophy },
    { id: 'xp', label: 'XP', icon: FaPercent },
    { id: 'voice', label: 'Voice XP', icon: FaMicrophone },
    { id: 'multipliers', label: 'Mnozniki', icon: FaPercent },
    { id: 'ignored', label: 'Ignorowane', icon: FaTimes },
    { id: 'roles', label: 'Role za poziomy', icon: FaUserShield },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Main toggle */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              <span className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg mr-3"><FaTrophy /></span>
              System Poziomow
            </h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.levelingEnabled}
                onChange={e => setSettings({...settings, levelingEnabled: e.target.checked})}
                className="w-5 h-5 text-yellow-600 rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">Wlacz system poziomow</span>
            </label>
          </div>

          {settings.levelingEnabled && (
            <>
              {/* Sub-tabs */}
              <div className="flex flex-wrap gap-2 card p-2">
                {subTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                      activeSubTab === tab.id
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                    }`}
                  >
                    <tab.icon className="mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* General Settings */}
              {activeSubTab === 'general' && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Ustawienia ogolne</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kanal na powiadomienia o awansie
                    </label>
                    <select
                      value={settings.levelingChannelId}
                      onChange={e => setSettings({...settings, levelingChannelId: e.target.value})}
                      className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Ten sam kanal (gdzie wyslano wiadomosc)</option>
                      {textChannels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Wiadomosc o awansie
                    </label>
                    <textarea
                      value={settings.levelingMessage}
                      onChange={e => setSettings({...settings, levelingMessage: e.target.value})}
                      className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      rows="2"
                    ></textarea>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Zmienne: {'{user}'} - wzmianka, {'{username}'} - nazwa, {'{level}'} - poziom, {'{server}'} - serwer, {'{totalXp}'} - calkowite XP
                    </p>
                  </div>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.levelingAnnounceDm}
                      onChange={e => setSettings({...settings, levelingAnnounceDm: e.target.checked})}
                      className="w-5 h-5 text-yellow-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Wyslij tez powiadomienie o awansie na DM</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Obrazek tla powiadomienia
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    />
                    {settings.levelingImage && (
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, levelingImage: ''})}
                        className="text-red-500 dark:text-red-400 text-sm mt-1 hover:underline"
                      >
                        Usun obrazek
                      </button>
                    )}
                  </div>

                  {/* Milestones */}
                  <div className="border-t border-gray-200 dark:border-dark-600 pt-4 mt-4">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2">Poziomy specjalne (milestone)</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Poziomy, ktore otrzymaja specjalna wiadomosc
                    </p>

                    {settings.levelingMilestones.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {settings.levelingMilestones.map(level => (
                          <span key={level} className="inline-flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                            Poziom {level}
                            <button type="button" onClick={() => handleRemoveMilestone(level)} className="ml-1 text-yellow-600 hover:text-yellow-800">
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={newMilestone}
                        onChange={e => setNewMilestone(e.target.value)}
                        placeholder="np. 10, 25, 50"
                        className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddMilestone}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                      >
                        <FaPlus />
                      </button>
                    </div>

                    {settings.levelingMilestones.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Specjalna wiadomosc milestone
                        </label>
                        <textarea
                          value={settings.levelingMilestoneMessage}
                          onChange={e => setSettings({...settings, levelingMilestoneMessage: e.target.value})}
                          placeholder="Gratulacje {user}! Osiagnales wielki kamien milowy - poziom {level}!"
                          className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          rows="2"
                        ></textarea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* XP Settings */}
              {activeSubTab === 'xp' && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Ustawienia XP</h3>

                  <label className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      checked={settings.xpRandomEnabled}
                      onChange={e => setSettings({...settings, xpRandomEnabled: e.target.checked})}
                      className="w-5 h-5 text-yellow-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Losowa ilosc XP (zakres min-max)</span>
                  </label>

                  {settings.xpRandomEnabled ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimalne XP za wiadomosc
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings.xpPerMessageMin}
                          onChange={e => setSettings({...settings, xpPerMessageMin: parseInt(e.target.value) || 10})}
                          className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Maksymalne XP za wiadomosc
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings.xpPerMessageMax}
                          onChange={e => setSettings({...settings, xpPerMessageMax: parseInt(e.target.value) || 25})}
                          className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        XP za wiadomosc
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.xpPerMessage}
                        onChange={e => setSettings({...settings, xpPerMessage: parseInt(e.target.value) || 15})}
                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cooldown (sekundy)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={settings.levelingCooldown}
                      onChange={e => setSettings({...settings, levelingCooldown: parseInt(e.target.value) || 60})}
                      className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Czas miedzy wiadomosciami, za ktore mozna zdobyc XP
                    </p>
                  </div>
                </div>
              )}

              {/* Voice XP Settings */}
              {activeSubTab === 'voice' && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                    <FaMicrophone className="mr-2 text-green-500" />
                    XP za kanaly glosowe
                  </h3>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.voiceXpEnabled}
                      onChange={e => setSettings({...settings, voiceXpEnabled: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Wlacz XP za przebywanie na kanalach glosowych</span>
                  </label>

                  {settings.voiceXpEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          XP za minute na kanale glosowym
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={settings.voiceXpPerMinute}
                          onChange={e => setSettings({...settings, voiceXpPerMinute: parseInt(e.target.value) || 5})}
                          className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.voiceXpRequireUnmuted}
                            onChange={e => setSettings({...settings, voiceXpRequireUnmuted: e.target.checked})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Wymagaj wlaczonego mikrofonu (nie zmutowany)</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.voiceXpRequireVideo}
                            onChange={e => setSettings({...settings, voiceXpRequireVideo: e.target.checked})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Wymagaj wlaczonej kamery</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.voiceXpIgnoreAfk}
                            onChange={e => setSettings({...settings, voiceXpIgnoreAfk: e.target.checked})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Ignoruj kanal AFK</span>
                        </label>
                      </div>

                      <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          XP jest przyznawane co minute przebywania na kanale glosowym.
                          Uzytkownicy sami na kanale (bez innych osob) nie otrzymuja XP.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Multipliers */}
              {activeSubTab === 'multipliers' && (
                <div className="card p-6 space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Mnozniki XP</h3>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.xpMultiplierEnabled}
                      onChange={e => setSettings({...settings, xpMultiplierEnabled: e.target.checked})}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Wlacz mnozniki XP</span>
                  </label>

                  {settings.xpMultiplierEnabled && (
                    <>
                      {/* Weekend multiplier */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mnoznik weekendowy (sobota-niedziela)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={settings.weekendMultiplier}
                          onChange={e => setSettings({...settings, weekendMultiplier: parseFloat(e.target.value) || 1.0})}
                          className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1.0 = normalny, 2.0 = podwojny XP</p>
                      </div>

                      {/* Channel multipliers */}
                      <div className="border-t border-gray-200 dark:border-dark-600 pt-4">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-2">Mnozniki kanalow</h4>

                        {settings.channelMultipliers.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {settings.channelMultipliers.map(m => (
                              <div key={m.channelId} className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 p-2 rounded">
                                <span>#{getChannelName(m.channelId)} - <span className="text-purple-600 dark:text-purple-400">{m.multiplier}x</span></span>
                                <button type="button" onClick={() => handleRemoveChannelMultiplier(m.channelId)} className="text-red-500 hover:text-red-700">
                                  <FaTrash />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <select
                            value={newChannelMultiplier.channelId}
                            onChange={e => setNewChannelMultiplier({...newChannelMultiplier, channelId: e.target.value})}
                            className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Wybierz kanal...</option>
                            {textChannels.filter(c => !settings.channelMultipliers.some(m => m.channelId === c.id)).map(c => (
                              <option key={c.id} value={c.id}>#{c.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={newChannelMultiplier.multiplier}
                            onChange={e => setNewChannelMultiplier({...newChannelMultiplier, multiplier: parseFloat(e.target.value) || 1.5})}
                            className="w-20 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          />
                          <button type="button" onClick={handleAddChannelMultiplier} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                            <FaPlus />
                          </button>
                        </div>
                      </div>

                      {/* Role multipliers */}
                      <div className="border-t border-gray-200 dark:border-dark-600 pt-4">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-2">Mnozniki rol</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Uzytkownicy z tymi rolami otrzymuja bonus XP. Uzywany jest najwyzszy mnoznik.
                        </p>

                        {settings.roleMultipliers.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {settings.roleMultipliers.map(m => (
                              <div key={m.roleId} className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 p-2 rounded">
                                <span>@{getRoleName(m.roleId)} - <span className="text-purple-600 dark:text-purple-400">{m.multiplier}x</span></span>
                                <button type="button" onClick={() => handleRemoveRoleMultiplier(m.roleId)} className="text-red-500 hover:text-red-700">
                                  <FaTrash />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <select
                            value={newRoleMultiplier.roleId}
                            onChange={e => setNewRoleMultiplier({...newRoleMultiplier, roleId: e.target.value})}
                            className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Wybierz role...</option>
                            {selectableRoles.filter(r => !settings.roleMultipliers.some(m => m.roleId === r.id)).map(r => (
                              <option key={r.id} value={r.id}>@{r.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={newRoleMultiplier.multiplier}
                            onChange={e => setNewRoleMultiplier({...newRoleMultiplier, multiplier: parseFloat(e.target.value) || 1.5})}
                            className="w-20 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          />
                          <button type="button" onClick={handleAddRoleMultiplier} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                            <FaPlus />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Ignored channels/roles */}
              {activeSubTab === 'ignored' && (
                <div className="card p-6 space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Ignorowane kanaly i role</h3>

                  {/* Ignored Channels */}
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center">
                      <FaHashtag className="mr-2 text-gray-500" />
                      Ignorowane kanaly (bez XP)
                    </h4>

                    {settings.levelingIgnoredChannels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {settings.levelingIgnoredChannels.map(channelId => (
                          <span key={channelId} className="inline-flex items-center bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                            #{getChannelName(channelId)}
                            <button type="button" onClick={() => handleRemoveIgnoredChannel(channelId)} className="ml-1 text-red-500 hover:text-red-700">
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <select
                        value={newIgnoredChannel}
                        onChange={e => setNewIgnoredChannel(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Wybierz kanal...</option>
                        {textChannels.filter(c => !settings.levelingIgnoredChannels.includes(c.id)).map(c => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleAddIgnoredChannel} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                        <FaPlus />
                      </button>
                    </div>
                  </div>

                  {/* Ignored Roles */}
                  <div className="border-t border-gray-200 dark:border-dark-600 pt-4">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center">
                      <FaUserShield className="mr-2 text-gray-500" />
                      Ignorowane role (nie zdobywaja XP)
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Uzytkownicy z tymi rolami nie moga zdobywac XP (np. zmutowani, boty)
                    </p>

                    {settings.levelingNoXpRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {settings.levelingNoXpRoles.map(roleId => (
                          <span key={roleId} className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                            @{getRoleName(roleId)}
                            <button type="button" onClick={() => handleRemoveNoXpRole(roleId)} className="ml-1 text-red-600 hover:text-red-800">
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <select
                        value={newNoXpRole}
                        onChange={e => setNewNoXpRole(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Wybierz role...</option>
                        {selectableRoles.filter(r => !settings.levelingNoXpRoles.includes(r.id)).map(r => (
                          <option key={r.id} value={r.id}>@{r.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleAddNoXpRole} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Level Roles */}
              {activeSubTab === 'roles' && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Role za poziomy</h3>

                  {/* Role stacking options */}
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.levelRolesStack}
                        onChange={e => setSettings({...settings, levelRolesStack: e.target.checked})}
                        className="w-5 h-5 text-purple-600 rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Kumuluj role (zachowaj wszystkie role z nizszych poziomow)</span>
                    </label>

                    {!settings.levelRolesStack && (
                      <label className="flex items-center space-x-2 ml-6">
                        <input
                          type="checkbox"
                          checked={settings.levelRolesRemoveLower}
                          onChange={e => setSettings({...settings, levelRolesRemoveLower: e.target.checked})}
                          className="w-5 h-5 text-purple-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Usuwaj role z nizszych poziomow przy awansie</span>
                      </label>
                    )}
                  </div>

                  {/* Existing level roles */}
                  {settings.levelRoles.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {settings.levelRoles.map((lr) => (
                        <div key={lr.level} className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                          <div>
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">Poziom {lr.level}</span>
                            <span className="mx-2 text-gray-400 dark:text-gray-500">-&gt;</span>
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-sm">
                              @{getRoleName(lr.roleId)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(lr.level)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new level role */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poziom</label>
                      <input
                        type="number"
                        min="1"
                        value={newRoleLevel}
                        onChange={e => setNewRoleLevel(e.target.value)}
                        placeholder="np. 5"
                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rola</label>
                      <select
                        value={newRoleId}
                        onChange={e => setNewRoleId(e.target.value)}
                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Wybierz role...</option>
                        {selectableRoles.map(r => (
                          <option key={r.id} value={r.id}>@{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRole}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                    >
                      <FaPlus className="mr-1" /> Dodaj
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    Role sa przyznawane automatycznie po osiagnieciu danego poziomu.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            {saving ? t('dashboard.saving') : t('common.saveChanges')}
          </button>
        </form>
      </div>

      {/* Preview */}
      {settings.levelingEnabled && (
        <div className="w-full xl:w-96 space-y-4">
          <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase">Podglad powiadomienia o awansie</h3>
          <DiscordPreview
            message={settings.levelingMessage
              ?.replace(/{user}/g, '@User')
              ?.replace(/{username}/g, 'User')
              ?.replace(/{level}/g, '5')
              ?.replace(/{server}/g, 'Server Name')
              ?.replace(/{totalXp}/g, '3,600')
            }
            image={settings.levelingImage}
            titleText="LEVEL UP!"
            channelName={getChannelName(settings.levelingChannelId) || 'general'}
          />

          {/* XP Calculator */}
          <div className="bg-gray-800 dark:bg-dark-700 text-white p-4 rounded-lg border border-gray-700 dark:border-dark-600">
            <h4 className="font-bold mb-2">Kalkulator poziomow</h4>
            <div className="text-sm space-y-1 text-gray-300 dark:text-gray-400">
              <p>XP na poziom = 100 * (poziom+1)^2</p>
              <p>Poziom 1: <span className="text-yellow-400">100 XP</span></p>
              <p>Poziom 5: <span className="text-yellow-400">3,600 XP</span></p>
              <p>Poziom 10: <span className="text-yellow-400">12,100 XP</span></p>
              <p>Poziom 20: <span className="text-yellow-400">44,100 XP</span></p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Przy {settings.xpRandomEnabled ? `${settings.xpPerMessageMin}-${settings.xpPerMessageMax}` : settings.xpPerMessage} XP/wiadomosc i {settings.levelingCooldown}s cooldown,
              poziom 10 wymaga ok. {Math.ceil(12100 / (settings.xpRandomEnabled ? (settings.xpPerMessageMin + settings.xpPerMessageMax) / 2 : settings.xpPerMessage))} wiadomosci.
            </p>
          </div>

          {/* Active multipliers summary */}
          {settings.xpMultiplierEnabled && (
            <div className="bg-purple-900/30 text-white p-4 rounded-lg border border-purple-700">
              <h4 className="font-bold mb-2 text-purple-300">Aktywne mnozniki</h4>
              <div className="text-sm space-y-1">
                {settings.weekendMultiplier > 1 && (
                  <p>Weekend: <span className="text-purple-400">{settings.weekendMultiplier}x</span></p>
                )}
                {settings.channelMultipliers.length > 0 && (
                  <p>Kanaly: <span className="text-purple-400">{settings.channelMultipliers.length} skonfigurowanych</span></p>
                )}
                {settings.roleMultipliers.length > 0 && (
                  <p>Role: <span className="text-purple-400">{settings.roleMultipliers.length} skonfigurowanych</span></p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
