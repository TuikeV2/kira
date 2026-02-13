import { useState, useEffect, useRef } from 'react';
import {
  FaHandSparkles, FaSignOutAlt, FaSave, FaImage, FaHashtag,
  FaPalette, FaUserTag, FaEnvelope, FaClock, FaRobot,
  FaShieldAlt, FaInfoCircle, FaCode, FaEye, FaEyeSlash,
  FaUserPlus, FaTimes, FaPlus, FaExclamationTriangle
} from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import DiscordPreview from '../DiscordPreview';
import { useTranslation } from '../../../contexts/LanguageContext';
import EmojiPicker from '../../ui/EmojiPicker';

const VARIABLES_INFO = [
  { var: '{user}', desc: 'Ping użytkownika (@user)' },
  { var: '{username}', desc: 'Nazwa użytkownika' },
  { var: '{displayName}', desc: 'Wyświetlana nazwa' },
  { var: '{tag}', desc: 'Pełny tag (user#0000)' },
  { var: '{userId}', desc: 'ID użytkownika' },
  { var: '{server}', desc: 'Nazwa serwera' },
  { var: '{memberCount}', desc: 'Liczba członków' },
  { var: '{createdAt}', desc: 'Data utworzenia konta' },
  { var: '{accountAge}', desc: 'Wiek konta w dniach' },
  { var: '{avatar}', desc: 'URL avatara' },
];

const PRESET_COLORS = [
  { name: 'Zielony', value: '#00ff00' },
  { name: 'Niebieski', value: '#3498db' },
  { name: 'Fioletowy', value: '#9b59b6' },
  { name: 'Złoty', value: '#f1c40f' },
  { name: 'Pomarańczowy', value: '#e67e22' },
  { name: 'Czerwony', value: '#e74c3c' },
  { name: 'Różowy', value: '#e91e63' },
  { name: 'Turkusowy', value: '#1abc9c' },
  { name: 'Discord', value: '#5865f2' },
];

export default function JoinLeaveTab({ guildId, channels, roles, initialSettings, setMessage, onSave }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [activeSection, setActiveSection] = useState('welcome'); // 'welcome' or 'goodbye'

  const welcomeMessageRef = useRef(null);
  const welcomeDmRef = useRef(null);
  const goodbyeMessageRef = useRef(null);

  const [settings, setSettings] = useState({
    // Welcome settings
    welcomeEnabled: false,
    welcomeChannelId: '',
    welcomeMessage: 'Witaj {user} na serwerze **{server}**! Jesteś {memberCount}. członkiem!',
    welcomeImage: '',
    welcomeTitle: 'Witaj na serwerze!',
    welcomeColor: '#00ff00',
    welcomeFooter: '',
    welcomeThumbnail: true,
    welcomePingUser: true,
    welcomeDelay: 0,
    welcomeIgnoreBots: true,

    // Welcome DM
    welcomeDmEnabled: false,
    welcomeDmMessage: 'Witaj na serwerze **{server}**! Cieszymy się, że do nas dołączyłeś.',

    // Auto-role
    autoRoleEnabled: false,
    autoRoleIds: [],
    autoRoleDelay: 0,
    autoRoleIgnoreBots: true,

    // Account age filter
    minAccountAge: 0,
    minAccountAgeAction: 'none', // 'none', 'kick', 'notify'
    minAccountAgeNotifyChannelId: '',

    // Goodbye settings
    goodbyeEnabled: false,
    goodbyeChannelId: '',
    goodbyeMessage: '{username} opuścił serwer. Żegnaj!',
    goodbyeImage: '',
    goodbyeTitle: 'Do widzenia!',
    goodbyeColor: '#e74c3c',
    goodbyeFooter: '',
    goodbyeThumbnail: true,
    goodbyeShowRoles: true,
    goodbyeShowJoinDate: true,
    goodbyeIgnoreBots: true,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        ...prev,
        ...initialSettings,
        welcomeEnabled: initialSettings.welcomeEnabled || false,
        goodbyeEnabled: initialSettings.goodbyeEnabled || false,
        autoRoleIds: initialSettings.autoRoleIds || [],
      }));
    }
  }, [initialSettings]);

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Obraz nie może być większy niż 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'welcome') setSettings({ ...settings, welcomeImage: reader.result });
        if (type === 'goodbye') setSettings({ ...settings, goodbyeImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
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
  const getRoleName = (id) => (roles || []).find(r => r.id === id)?.name || 'Unknown';

  const selectableRoles = (roles || []).filter(r =>
    r.name !== '@everyone' && !r.managed && r.canManage
  );

  const toggleAutoRole = (roleId) => {
    const current = settings.autoRoleIds || [];
    if (current.includes(roleId)) {
      setSettings({ ...settings, autoRoleIds: current.filter(id => id !== roleId) });
    } else {
      setSettings({ ...settings, autoRoleIds: [...current, roleId] });
    }
  };

  const insertVariable = (variable, ref) => {
    if (ref?.current) {
      const input = ref.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const value = input.value;
      const newValue = value.substring(0, start) + variable + value.substring(end);

      // Determine which field we're updating
      if (ref === welcomeMessageRef) {
        setSettings({ ...settings, welcomeMessage: newValue });
      } else if (ref === welcomeDmRef) {
        setSettings({ ...settings, welcomeDmMessage: newValue });
      } else if (ref === goodbyeMessageRef) {
        setSettings({ ...settings, goodbyeMessage: newValue });
      }

      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + variable.length;
        input.focus();
      }, 0);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
      <div>
        <span className="font-medium text-gray-900 dark:text-white text-sm">{label}</span>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800 ${enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'}`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const ColorPicker = ({ value, onChange, label }) => (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map(color => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={`w-8 h-8 rounded-lg border-2 transition-all ${value === color.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border-0"
          title="Własny kolor"
        />
      </div>
    </div>
  );

  const VariablesPanel = () => (
    <div className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mb-4 ${showVariables ? '' : 'hidden'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <FaCode className="w-4 h-4" />
          Dostępne zmienne
        </h4>
        <button type="button" onClick={() => setShowVariables(false)} className="text-blue-500 hover:text-blue-700">
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {VARIABLES_INFO.map(v => (
          <div key={v.var} className="flex items-center gap-2 text-sm">
            <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-mono text-xs">
              {v.var}
            </code>
            <span className="text-gray-600 dark:text-gray-400 text-xs truncate">{v.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Settings */}
      <div className="flex-1 space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-6">

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-dark-700 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveSection('welcome')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                activeSection === 'welcome'
                  ? 'bg-white dark:bg-dark-800 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FaHandSparkles className="w-4 h-4" />
              Welcome
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('goodbye')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                activeSection === 'goodbye'
                  ? 'bg-white dark:bg-dark-800 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FaSignOutAlt className="w-4 h-4" />
              Goodbye
            </button>
          </div>

          {/* Variables Toggle */}
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showVariables ? <FaEyeSlash className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
            {showVariables ? 'Ukryj zmienne' : 'Pokaż dostępne zmienne'}
          </button>

          <VariablesPanel />

          {/* WELCOME SECTION */}
          {activeSection === 'welcome' && (
            <div className="space-y-6 animate-fade-in">
              {/* Welcome Message */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                      <FaHandSparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Wiadomość powitalna</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wysyłana na kanał gdy ktoś dołączy</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, welcomeEnabled: !settings.welcomeEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.welcomeEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${settings.welcomeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {settings.welcomeEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label"><FaHashtag className="inline w-3 h-3 mr-1" />Kanał</label>
                        <select
                          value={settings.welcomeChannelId}
                          onChange={e => setSettings({ ...settings, welcomeChannelId: e.target.value })}
                          className="select"
                        >
                          <option value="">Wybierz kanał...</option>
                          {(channels || []).filter(c => c.type === 0).map(c => (
                            <option key={c.id} value={c.id}>#{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label"><FaClock className="inline w-3 h-3 mr-1" />Opóźnienie (sekundy)</label>
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={settings.welcomeDelay}
                          onChange={e => setSettings({ ...settings, welcomeDelay: parseInt(e.target.value) || 0 })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Tytuł embeda</label>
                      <input
                        type="text"
                        value={settings.welcomeTitle}
                        onChange={e => setSettings({ ...settings, welcomeTitle: e.target.value })}
                        className="input"
                        placeholder="Witaj na serwerze!"
                      />
                    </div>

                    <div>
                      <label className="label">Wiadomość</label>
                      <div className="relative">
                        <textarea
                          ref={welcomeMessageRef}
                          value={settings.welcomeMessage}
                          onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })}
                          className="input min-h-[100px] resize-y pr-10"
                          placeholder="Witaj {user} na serwerze {server}!"
                        />
                        <div className="absolute right-2 top-2 flex gap-1">
                          <EmojiPicker
                            guildId={guildId}
                            onSelect={(emoji) => setSettings({ ...settings, welcomeMessage: settings.welcomeMessage + emoji })}
                            inputRef={welcomeMessageRef}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {VARIABLES_INFO.slice(0, 5).map(v => (
                          <button
                            key={v.var}
                            type="button"
                            onClick={() => insertVariable(v.var, welcomeMessageRef)}
                            className="text-xs bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 px-2 py-1 rounded text-gray-600 dark:text-gray-400"
                          >
                            {v.var}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label">Footer (opcjonalny)</label>
                      <input
                        type="text"
                        value={settings.welcomeFooter}
                        onChange={e => setSettings({ ...settings, welcomeFooter: e.target.value })}
                        className="input"
                        placeholder="np. Przeczytaj regulamin!"
                      />
                    </div>

                    <ColorPicker
                      value={settings.welcomeColor}
                      onChange={(color) => setSettings({ ...settings, welcomeColor: color })}
                      label="Kolor embeda"
                    />

                    <div>
                      <label className="label"><FaImage className="inline w-3 h-3 mr-1" />Tło obrazka</label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'welcome')}
                          className="flex-1 block text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:text-sm file:font-medium file:bg-green-50 dark:file:bg-green-900/20
                            file:text-green-700 dark:file:text-green-300 hover:file:bg-green-100
                            file:cursor-pointer file:transition-colors"
                        />
                        {settings.welcomeImage && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, welcomeImage: '' })}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ToggleSwitch
                        enabled={settings.welcomePingUser}
                        onChange={() => setSettings({ ...settings, welcomePingUser: !settings.welcomePingUser })}
                        label="Pinguj użytkownika"
                        description="Wyślij ping poza embedem"
                      />
                      <ToggleSwitch
                        enabled={settings.welcomeThumbnail}
                        onChange={() => setSettings({ ...settings, welcomeThumbnail: !settings.welcomeThumbnail })}
                        label="Pokaż avatar"
                        description="Wyświetl avatar w rogu"
                      />
                      <ToggleSwitch
                        enabled={settings.welcomeIgnoreBots}
                        onChange={() => setSettings({ ...settings, welcomeIgnoreBots: !settings.welcomeIgnoreBots })}
                        label="Ignoruj boty"
                        description="Nie witaj botów"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Welcome DM */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <FaEnvelope className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Wiadomość prywatna (DM)</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wysyłana bezpośrednio do użytkownika</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, welcomeDmEnabled: !settings.welcomeDmEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.welcomeDmEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-dark-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${settings.welcomeDmEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {settings.welcomeDmEnabled && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                        <FaInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Wiadomość nie zostanie wysłana jeśli użytkownik ma wyłączone DM od członków serwera.
                      </p>
                    </div>
                    <div>
                      <label className="label">Wiadomość DM</label>
                      <div className="relative">
                        <textarea
                          ref={welcomeDmRef}
                          value={settings.welcomeDmMessage}
                          onChange={e => setSettings({ ...settings, welcomeDmMessage: e.target.value })}
                          className="input min-h-[100px] resize-y"
                          placeholder="Witaj na serwerze {server}!"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-role */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                      <FaUserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Auto-role</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Automatycznie przydzielaj role nowym członkom</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, autoRoleEnabled: !settings.autoRoleEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoRoleEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-dark-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${settings.autoRoleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {settings.autoRoleEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Role do przydzielenia</label>
                      <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg border border-gray-200 dark:border-dark-600">
                        {selectableRoles.length === 0 ? (
                          <p className="text-sm text-gray-400">Brak dostępnych ról do przydzielenia. Bot musi mieć wyższą rolę.</p>
                        ) : (
                          selectableRoles.map(role => (
                            <label
                              key={role.id}
                              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={(settings.autoRoleIds || []).includes(role.id)}
                                onChange={() => toggleAutoRole(role.id)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {(settings.autoRoleIds || []).length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Wybrano: {(settings.autoRoleIds || []).map(id => getRoleName(id)).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label"><FaClock className="inline w-3 h-3 mr-1" />Opóźnienie (sekundy)</label>
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={settings.autoRoleDelay}
                          onChange={e => setSettings({ ...settings, autoRoleDelay: parseInt(e.target.value) || 0 })}
                          className="input"
                        />
                      </div>
                    </div>

                    <ToggleSwitch
                      enabled={settings.autoRoleIgnoreBots}
                      onChange={() => setSettings({ ...settings, autoRoleIgnoreBots: !settings.autoRoleIgnoreBots })}
                      label="Ignoruj boty"
                      description="Nie przydzielaj ról botom"
                    />
                  </div>
                )}
              </div>

              {/* Account Age Filter */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                      <FaShieldAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ochrona przed nowymi kontami</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Filtruj użytkowników z młodymi kontami</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Minimalny wiek konta (dni)</label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={settings.minAccountAge}
                        onChange={e => setSettings({ ...settings, minAccountAge: parseInt(e.target.value) || 0 })}
                        className="input"
                        placeholder="0 = wyłączone"
                      />
                    </div>
                    <div>
                      <label className="label">Akcja</label>
                      <select
                        value={settings.minAccountAgeAction}
                        onChange={e => setSettings({ ...settings, minAccountAgeAction: e.target.value })}
                        className="select"
                      >
                        <option value="none">Brak (tylko ostrzeżenie)</option>
                        <option value="notify">Powiadom na kanale</option>
                        <option value="kick">Wyrzuć z serwera</option>
                      </select>
                    </div>
                  </div>

                  {settings.minAccountAgeAction === 'notify' && (
                    <div>
                      <label className="label">Kanał powiadomień</label>
                      <select
                        value={settings.minAccountAgeNotifyChannelId}
                        onChange={e => setSettings({ ...settings, minAccountAgeNotifyChannelId: e.target.value })}
                        className="select"
                      >
                        <option value="">Wybierz kanał...</option>
                        {(channels || []).filter(c => c.type === 0).map(c => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {settings.minAccountAge > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                        <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Konta młodsze niż {settings.minAccountAge} dni będą {
                          settings.minAccountAgeAction === 'kick' ? 'automatycznie wyrzucane' :
                          settings.minAccountAgeAction === 'notify' ? 'raportowane na kanał' :
                          'oznaczane w wiadomości powitalnej'
                        }.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GOODBYE SECTION */}
          {activeSection === 'goodbye' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      <FaSignOutAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Wiadomość pożegnalna</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wysyłana gdy ktoś opuści serwer</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, goodbyeEnabled: !settings.goodbyeEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.goodbyeEnabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-dark-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${settings.goodbyeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {settings.goodbyeEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="label"><FaHashtag className="inline w-3 h-3 mr-1" />Kanał</label>
                      <select
                        value={settings.goodbyeChannelId}
                        onChange={e => setSettings({ ...settings, goodbyeChannelId: e.target.value })}
                        className="select"
                      >
                        <option value="">Wybierz kanał...</option>
                        {(channels || []).filter(c => c.type === 0).map(c => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Tytuł embeda</label>
                      <input
                        type="text"
                        value={settings.goodbyeTitle}
                        onChange={e => setSettings({ ...settings, goodbyeTitle: e.target.value })}
                        className="input"
                        placeholder="Do widzenia!"
                      />
                    </div>

                    <div>
                      <label className="label">Wiadomość</label>
                      <div className="relative">
                        <textarea
                          ref={goodbyeMessageRef}
                          value={settings.goodbyeMessage}
                          onChange={e => setSettings({ ...settings, goodbyeMessage: e.target.value })}
                          className="input min-h-[100px] resize-y pr-10"
                          placeholder="{username} opuścił serwer."
                        />
                        <div className="absolute right-2 top-2">
                          <EmojiPicker
                            guildId={guildId}
                            onSelect={(emoji) => setSettings({ ...settings, goodbyeMessage: settings.goodbyeMessage + emoji })}
                            inputRef={goodbyeMessageRef}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {VARIABLES_INFO.slice(0, 5).map(v => (
                          <button
                            key={v.var}
                            type="button"
                            onClick={() => insertVariable(v.var, goodbyeMessageRef)}
                            className="text-xs bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 px-2 py-1 rounded text-gray-600 dark:text-gray-400"
                          >
                            {v.var}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label">Footer (opcjonalny)</label>
                      <input
                        type="text"
                        value={settings.goodbyeFooter}
                        onChange={e => setSettings({ ...settings, goodbyeFooter: e.target.value })}
                        className="input"
                        placeholder="np. Mamy nadzieję, że wrócisz!"
                      />
                    </div>

                    <ColorPicker
                      value={settings.goodbyeColor}
                      onChange={(color) => setSettings({ ...settings, goodbyeColor: color })}
                      label="Kolor embeda"
                    />

                    <div>
                      <label className="label"><FaImage className="inline w-3 h-3 mr-1" />Tło obrazka</label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'goodbye')}
                          className="flex-1 block text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:text-sm file:font-medium file:bg-red-50 dark:file:bg-red-900/20
                            file:text-red-700 dark:file:text-red-300 hover:file:bg-red-100
                            file:cursor-pointer file:transition-colors"
                        />
                        {settings.goodbyeImage && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, goodbyeImage: '' })}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ToggleSwitch
                        enabled={settings.goodbyeThumbnail}
                        onChange={() => setSettings({ ...settings, goodbyeThumbnail: !settings.goodbyeThumbnail })}
                        label="Pokaż avatar"
                        description="Wyświetl avatar użytkownika"
                      />
                      <ToggleSwitch
                        enabled={settings.goodbyeShowRoles}
                        onChange={() => setSettings({ ...settings, goodbyeShowRoles: !settings.goodbyeShowRoles })}
                        label="Pokaż role"
                        description="Wyświetl role użytkownika"
                      />
                      <ToggleSwitch
                        enabled={settings.goodbyeShowJoinDate}
                        onChange={() => setSettings({ ...settings, goodbyeShowJoinDate: !settings.goodbyeShowJoinDate })}
                        label="Pokaż czas na serwerze"
                        description="Ile czasu był na serwerze"
                      />
                      <ToggleSwitch
                        enabled={settings.goodbyeIgnoreBots}
                        onChange={() => setSettings({ ...settings, goodbyeIgnoreBots: !settings.goodbyeIgnoreBots })}
                        label="Ignoruj boty"
                        description="Nie żegnaj botów"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Zapisywanie...
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                Zapisz zmiany
              </>
            )}
          </button>
        </form>
      </div>

      {/* Previews */}
      <div className="w-full xl:w-96 space-y-6">
        <div className="sticky top-6 space-y-6">
          {activeSection === 'welcome' && settings.welcomeEnabled && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Podgląd wiadomości powitalnej
              </h3>
              <DiscordPreview
                message={settings.welcomeMessage}
                image={settings.welcomeImage}
                titleText={settings.welcomeTitle}
                channelName={getChannelName(settings.welcomeChannelId)}
                color={settings.welcomeColor}
                footer={settings.welcomeFooter}
                showThumbnail={settings.welcomeThumbnail}
                pingUser={settings.welcomePingUser}
              />
            </div>
          )}

          {activeSection === 'goodbye' && settings.goodbyeEnabled && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Podgląd wiadomości pożegnalnej
              </h3>
              <DiscordPreview
                message={settings.goodbyeMessage}
                image={settings.goodbyeImage}
                titleText={settings.goodbyeTitle}
                channelName={getChannelName(settings.goodbyeChannelId)}
                color={settings.goodbyeColor}
                footer={settings.goodbyeFooter}
                showThumbnail={settings.goodbyeThumbnail}
              />
            </div>
          )}

          {/* Info box */}
          <div className="bg-gray-50 dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FaInfoCircle className="w-4 h-4 text-blue-500" />
              Wskazówki
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Użyj zmiennych jak <code className="bg-gray-200 dark:bg-dark-700 px-1 rounded">{'{user}'}</code> aby personalizować wiadomości</li>
              <li>• Obrazek tła powinien mieć proporcje ~3:1</li>
              <li>• Opóźnienie przydatne gdy bot musi poczekać na weryfikację</li>
              <li>• Auto-role wymaga odpowiednich uprawnień bota</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
