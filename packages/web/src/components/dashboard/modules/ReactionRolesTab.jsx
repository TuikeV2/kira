import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaPlus, FaTrash, FaLink, FaCog, FaLock, FaClock, FaEnvelope, FaEdit, FaCopy, FaToggleOn, FaToggleOff, FaChevronDown, FaChevronUp, FaInfoCircle, FaTimes, FaCheck } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import DiscordPreview from '../DiscordPreview';
import { useTranslation } from '../../../contexts/LanguageContext';
import EmojiPicker from '../../ui/EmojiPicker';

const BUTTON_STYLES = [
  { value: 'Primary', label: 'Blue', color: 'bg-blue-500' },
  { value: 'Secondary', label: 'Gray', color: 'bg-gray-500' },
  { value: 'Success', label: 'Green', color: 'bg-green-500' },
  { value: 'Danger', label: 'Red', color: 'bg-red-500' },
];

const PANEL_MODES = [
  { value: 'normal', label: 'Normal (Toggle)', description: 'Users can add/remove roles freely' },
  { value: 'single', label: 'Single Select', description: 'Users can only have ONE role from this panel' },
  { value: 'verify', label: 'Verify (One-time)', description: 'Users get role once, cannot remove it' },
  { value: 'limited', label: 'Limited Multi', description: 'Users can have up to X roles from panel' },
];

const TIME_UNITS = [
  { value: 'minutes', label: 'Minutes', multiplier: 60 },
  { value: 'hours', label: 'Hours', multiplier: 3600 },
  { value: 'days', label: 'Days', multiplier: 86400 },
];

export default function ReactionRolesTab({ guildId, channels, roles, initialPanels = [], setMessage, onUpdate }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [existingPanels, setExistingPanels] = useState([]);
  const [editingPanel, setEditingPanel] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState({});
  const emojiInputRefs = useRef([]);
  const descriptionRef = useRef(null);
  const titleRef = useRef(null);

  const initialFormState = {
    mode: 'new',
    interactionType: 'reaction',
    messageId: '',
    channelId: '',
    title: 'Role Selection',
    description: 'React to get a role!',
    color: '#9333ea',
    // Panel settings
    panelMode: 'normal', // normal, single, verify, limited
    maxRoles: 1,
    // Requirements
    requiredRoles: [],
    forbiddenRoles: [],
    minAccountAge: 0, // in days
    minServerTime: 0, // in days
    // Features
    dmNotification: false,
    dmMessage: 'You have been given the role: {role}',
    logChannel: '',
    // Roles
    roles: [{
      emoji: '',
      roleId: '',
      buttonLabel: '',
      buttonStyle: 'Primary',
      description: '',
      tempDuration: 0,
      tempUnit: 'hours'
    }]
  };

  const [reactionRoleData, setReactionRoleData] = useState(initialFormState);

  useEffect(() => {
    setExistingPanels(initialPanels || []);
  }, [initialPanels]);

  const getChannelName = (id) => (channels || []).find(c => c.id === id)?.name || 'unknown-channel';
  const getRoleName = (id) => (roles || []).find(r => r.id === id)?.name || 'Unknown Role';
  const getRoleColor = (id) => {
    const role = (roles || []).find(r => r.id === id);
    return role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5';
  };

  const resetForm = () => {
    setReactionRoleData(initialFormState);
    setEditingPanel(null);
    setShowAdvanced(false);
  };

  const loadPanelForEdit = (panel) => {
    setEditingPanel(panel.id);
    setReactionRoleData({
      mode: 'existing',
      interactionType: panel.interactionType || 'reaction',
      messageId: panel.messageId,
      channelId: panel.channelId,
      title: panel.title || 'Role Selection',
      description: panel.description || '',
      color: panel.color || '#9333ea',
      panelMode: panel.panelMode || 'normal',
      maxRoles: panel.maxRoles || 1,
      requiredRoles: panel.requiredRoles || [],
      forbiddenRoles: panel.forbiddenRoles || [],
      minAccountAge: panel.minAccountAge || 0,
      minServerTime: panel.minServerTime || 0,
      dmNotification: panel.dmNotification || false,
      dmMessage: panel.dmMessage || 'You have been given the role: {role}',
      logChannel: panel.logChannel || '',
      roles: panel.roles.map(r => ({
        emoji: r.originalEmoji || r.emoji || '',
        roleId: r.roleId,
        buttonLabel: r.buttonLabel || '',
        buttonStyle: r.buttonStyle || 'Primary',
        description: r.description || '',
        tempDuration: r.tempDuration || 0,
        tempUnit: r.tempUnit || 'hours'
      }))
    });
    setShowAdvanced(true);
  };

  const duplicatePanel = (panel) => {
    setEditingPanel(null);
    setReactionRoleData({
      mode: 'new',
      interactionType: panel.interactionType || 'reaction',
      messageId: '',
      channelId: panel.channelId,
      title: `${panel.title || 'Role Selection'} (Copy)`,
      description: panel.description || '',
      color: panel.color || '#9333ea',
      panelMode: panel.panelMode || 'normal',
      maxRoles: panel.maxRoles || 1,
      requiredRoles: panel.requiredRoles || [],
      forbiddenRoles: panel.forbiddenRoles || [],
      minAccountAge: panel.minAccountAge || 0,
      minServerTime: panel.minServerTime || 0,
      dmNotification: panel.dmNotification || false,
      dmMessage: panel.dmMessage || 'You have been given the role: {role}',
      logChannel: panel.logChannel || '',
      roles: panel.roles.map(r => ({
        emoji: r.originalEmoji || r.emoji || '',
        roleId: r.roleId,
        buttonLabel: r.buttonLabel || '',
        buttonStyle: r.buttonStyle || 'Primary',
        description: r.description || '',
        tempDuration: r.tempDuration || 0,
        tempUnit: r.tempUnit || 'hours'
      }))
    });
    setShowAdvanced(true);
    setMessage({ type: 'info', text: 'Panel loaded for duplication. Make changes and create.' });
  };

  const handleCreateReactionPanel = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isButtonMode = reactionRoleData.interactionType === 'button';

      // Validation
      if (!reactionRoleData.channelId) {
        setMessage({ type: 'error', text: 'Please select a channel' });
        setSaving(false);
        return;
      }

      if (isButtonMode) {
        if (reactionRoleData.roles.some(r => !r.buttonLabel || !r.roleId)) {
          setMessage({ type: 'error', text: 'Please fill button label and role for all entries' });
          setSaving(false);
          return;
        }
      } else {
        if (reactionRoleData.roles.some(r => !r.emoji || !r.roleId)) {
          setMessage({ type: 'error', text: 'Please fill emoji and role for all entries' });
          setSaving(false);
          return;
        }
      }

      if (reactionRoleData.mode === 'existing' && !reactionRoleData.messageId && !editingPanel) {
        setMessage({ type: 'error', text: 'Message ID is required for existing mode' });
        setSaving(false);
        return;
      }

      const panelData = {
        channelId: reactionRoleData.channelId,
        mode: editingPanel ? 'update' : reactionRoleData.mode,
        interactionType: reactionRoleData.interactionType,
        messageId: editingPanel ? reactionRoleData.messageId : (reactionRoleData.mode === 'existing' ? reactionRoleData.messageId : null),
        panelId: editingPanel || null,
        embed: (reactionRoleData.mode === 'new' || editingPanel) ? {
          title: reactionRoleData.title,
          description: reactionRoleData.description,
          color: parseInt(reactionRoleData.color.replace('#', ''), 16)
        } : null,
        // Panel settings
        panelMode: reactionRoleData.panelMode,
        maxRoles: reactionRoleData.panelMode === 'limited' ? reactionRoleData.maxRoles : null,
        // Requirements
        requiredRoles: reactionRoleData.requiredRoles,
        forbiddenRoles: reactionRoleData.forbiddenRoles,
        minAccountAge: reactionRoleData.minAccountAge,
        minServerTime: reactionRoleData.minServerTime,
        // Features
        dmNotification: reactionRoleData.dmNotification,
        dmMessage: reactionRoleData.dmMessage,
        logChannel: reactionRoleData.logChannel,
        // Roles with all settings
        roles: reactionRoleData.roles.map(r => ({
          ...r,
          buttonLabel: r.buttonLabel || getRoleName(r.roleId),
          tempDurationSeconds: r.tempDuration > 0 ? r.tempDuration * (TIME_UNITS.find(u => u.value === r.tempUnit)?.multiplier || 3600) : 0
        }))
      };

      const response = await dashboardService.createReactionRole(guildId, panelData);

      const failedEmojis = response?.data?.data?.failedEmojis || [];
      if (failedEmojis.length > 0) {
        setMessage({ type: 'warning', text: `Panel ${editingPanel ? 'updated' : 'created'}, but some emojis failed: ${failedEmojis.join(', ')}` });
      } else {
        setMessage({ type: 'success', text: editingPanel ? 'Panel Updated!' : (isButtonMode ? 'Button Role Panel Created!' : 'Reaction Role Panel Created!') });
      }

      resetForm();
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to create panel';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const deleteReactionPanel = async (panelId) => {
    if (!window.confirm("Delete this panel? The Discord message will also be deleted (if created by bot) or bot reactions will be removed.")) return;

    try {
      const response = await dashboardService.deleteReactionRole(guildId, panelId);
      const message = response?.data?.message || 'Panel deleted';
      setMessage({ type: 'success', text: message });
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to delete panel';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const togglePanelEnabled = async (panel) => {
    try {
      await dashboardService.createReactionRole(guildId, {
        mode: 'toggle',
        panelId: panel.id,
        enabled: !panel.enabled
      });
      setMessage({ type: 'success', text: `Panel ${panel.enabled ? 'disabled' : 'enabled'}` });
      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle panel' });
    }
  };

  const addReactionRoleRow = () => {
    setReactionRoleData({
      ...reactionRoleData,
      roles: [...reactionRoleData.roles, {
        emoji: '',
        roleId: '',
        buttonLabel: '',
        buttonStyle: 'Primary',
        description: '',
        tempDuration: 0,
        tempUnit: 'hours'
      }]
    });
  };

  const removeReactionRoleRow = (index) => {
    const newRoles = [...reactionRoleData.roles];
    newRoles.splice(index, 1);
    setReactionRoleData({ ...reactionRoleData, roles: newRoles });
  };

  const updateReactionRoleRow = (index, field, value) => {
    const newRoles = [...reactionRoleData.roles];
    newRoles[index][field] = value;
    setReactionRoleData({ ...reactionRoleData, roles: newRoles });
  };

  const toggleRequiredRole = (roleId) => {
    const current = reactionRoleData.requiredRoles || [];
    if (current.includes(roleId)) {
      setReactionRoleData({ ...reactionRoleData, requiredRoles: current.filter(id => id !== roleId) });
    } else {
      setReactionRoleData({ ...reactionRoleData, requiredRoles: [...current, roleId] });
    }
  };

  const toggleForbiddenRole = (roleId) => {
    const current = reactionRoleData.forbiddenRoles || [];
    if (current.includes(roleId)) {
      setReactionRoleData({ ...reactionRoleData, forbiddenRoles: current.filter(id => id !== roleId) });
    } else {
      setReactionRoleData({ ...reactionRoleData, forbiddenRoles: [...current, roleId] });
    }
  };

  const toggleExpandPanel = (panelId) => {
    setExpandedPanels(prev => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  const isButtonMode = reactionRoleData.interactionType === 'button';

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-6">
        {/* CREATOR */}
        <form onSubmit={handleCreateReactionPanel} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <FaRobot className="mr-2 text-purple-500" />
              {editingPanel ? 'Edit Panel' : 'Create Role Panel'}
            </h2>
            {editingPanel && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
                <FaTimes /> Cancel Edit
              </button>
            )}
          </div>

          {/* Interaction Type Selection */}
          <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="interactionType"
                checked={reactionRoleData.interactionType === 'reaction'}
                onChange={() => setReactionRoleData({ ...reactionRoleData, interactionType: 'reaction' })}
                className="text-blue-600"
              />
              <span className="font-medium text-blue-900 dark:text-blue-200">Reactions (Emoji)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="interactionType"
                checked={reactionRoleData.interactionType === 'button'}
                onChange={() => setReactionRoleData({ ...reactionRoleData, interactionType: 'button' })}
                className="text-blue-600"
              />
              <span className="font-medium text-blue-900 dark:text-blue-200">Buttons</span>
            </label>
          </div>

          {/* Panel Mode Selection */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">Panel Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {PANEL_MODES.map(mode => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${
                    reactionRoleData.panelMode === mode.value
                      ? 'bg-purple-100 dark:bg-purple-800/40 border-purple-400 dark:border-purple-600'
                      : 'bg-white dark:bg-dark-700 border-gray-200 dark:border-dark-600 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="panelMode"
                    checked={reactionRoleData.panelMode === mode.value}
                    onChange={() => setReactionRoleData({ ...reactionRoleData, panelMode: mode.value })}
                    className="text-purple-600 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white text-sm">{mode.label}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {reactionRoleData.panelMode === 'limited' && (
              <div className="mt-3">
                <label className="text-sm text-purple-800 dark:text-purple-300">Max roles per user:</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={reactionRoleData.maxRoles}
                  onChange={e => setReactionRoleData({ ...reactionRoleData, maxRoles: parseInt(e.target.value) || 1 })}
                  className="ml-2 w-20 border border-purple-300 dark:border-purple-600 rounded p-1 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Message Mode Selection - only for reactions and not editing */}
          {!isButtonMode && !editingPanel && (
            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={reactionRoleData.mode === 'new'}
                  onChange={() => setReactionRoleData({ ...reactionRoleData, mode: 'new' })}
                  className="text-purple-600"
                />
                <span className="font-medium text-gray-700 dark:text-gray-300">Create New Message</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={reactionRoleData.mode === 'existing'}
                  onChange={() => setReactionRoleData({ ...reactionRoleData, mode: 'existing' })}
                  className="text-purple-600"
                />
                <span className="font-medium text-gray-700 dark:text-gray-300">Use Existing Message</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
            <select
              value={reactionRoleData.channelId}
              onChange={e => setReactionRoleData({ ...reactionRoleData, channelId: e.target.value })}
              className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select Channel...</option>
              {channels.filter(c => c.type === 0).map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>

          {!isButtonMode && reactionRoleData.mode === 'existing' && !editingPanel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message ID</label>
              <div className="flex items-center relative">
                <FaLink className="absolute ml-3 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={reactionRoleData.messageId}
                  onChange={e => setReactionRoleData({ ...reactionRoleData, messageId: e.target.value })}
                  className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 pl-10 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  placeholder="Enter the ID of the message to react to"
                  required
                />
              </div>
            </div>
          )}

          {(isButtonMode || reactionRoleData.mode === 'new' || editingPanel) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Panel Title</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={reactionRoleData.title}
                      onChange={e => setReactionRoleData({ ...reactionRoleData, title: e.target.value })}
                      ref={titleRef}
                      className="flex-1 border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                    <EmojiPicker
                      guildId={guildId}
                      onSelect={(emoji) => setReactionRoleData({ ...reactionRoleData, title: reactionRoleData.title + emoji })}
                      inputRef={titleRef}
                      position="bottom"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <input
                    type="color"
                    value={reactionRoleData.color}
                    onChange={e => setReactionRoleData({ ...reactionRoleData, color: e.target.value })}
                    className="w-full h-11 border border-gray-300 dark:border-dark-600 rounded-lg p-1 bg-white dark:bg-dark-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <div className="relative">
                  <textarea
                    value={reactionRoleData.description}
                    onChange={e => setReactionRoleData({ ...reactionRoleData, description: e.target.value })}
                    ref={descriptionRef}
                    className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 pr-10 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    rows="3"
                  />
                  <div className="absolute right-2 top-2">
                    <EmojiPicker
                      guildId={guildId}
                      onSelect={(emoji) => setReactionRoleData({ ...reactionRoleData, description: reactionRoleData.description + emoji })}
                      inputRef={descriptionRef}
                      position="bottom"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Roles Configuration */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isButtonMode ? 'Buttons & Roles' : 'Emoji & Roles'}
            </label>
            {reactionRoleData.roles.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-dark-600 rounded-lg p-3 bg-gray-50 dark:bg-dark-700 space-y-2">
                <div className="flex gap-2 items-center flex-wrap">
                  {isButtonMode ? (
                    <>
                      <input
                        type="text"
                        placeholder="Button label"
                        value={item.buttonLabel}
                        onChange={(e) => updateReactionRoleRow(index, 'buttonLabel', e.target.value)}
                        className="w-36 border border-gray-300 dark:border-dark-600 rounded-lg p-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                        required
                      />
                      <select
                        value={item.buttonStyle}
                        onChange={(e) => updateReactionRoleRow(index, 'buttonStyle', e.target.value)}
                        className="w-28 border border-gray-300 dark:border-dark-600 rounded-lg p-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                      >
                        {BUTTON_STYLES.map(style => (
                          <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Emoji"
                        value={item.emoji}
                        onChange={(e) => updateReactionRoleRow(index, 'emoji', e.target.value)}
                        ref={el => emojiInputRefs.current[index] = el}
                        className="w-20 border border-gray-300 dark:border-dark-600 rounded-lg p-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                        required
                      />
                      <EmojiPicker
                        guildId={guildId}
                        onSelect={(emoji) => updateReactionRoleRow(index, 'emoji', emoji)}
                        inputRef={{ current: emojiInputRefs.current[index] }}
                        position="bottom"
                      />
                    </div>
                  )}
                  <select
                    value={item.roleId}
                    onChange={(e) => updateReactionRoleRow(index, 'roleId', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-dark-600 rounded-lg p-2 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Role</option>
                    {(roles || []).filter(r => r.name !== '@everyone').map(r => (
                      <option key={r.id} value={r.id} style={{ color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : 'inherit' }}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeReactionRoleRow(index)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded"
                    disabled={reactionRoleData.roles.length === 1}
                  >
                    <FaTrash />
                  </button>
                </div>

                {/* Role description & temp duration */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Role description (optional)"
                    value={item.description}
                    onChange={(e) => updateReactionRoleRow(index, 'description', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-dark-600 rounded p-1.5 text-sm bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-1">
                    <FaClock className="text-gray-400 text-sm" />
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.tempDuration || ''}
                      onChange={(e) => updateReactionRoleRow(index, 'tempDuration', parseInt(e.target.value) || 0)}
                      className="w-16 border border-gray-300 dark:border-dark-600 rounded p-1.5 text-sm bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                      title="Temporary role duration (0 = permanent)"
                    />
                    <select
                      value={item.tempUnit}
                      onChange={(e) => updateReactionRoleRow(index, 'tempUnit', e.target.value)}
                      className="border border-gray-300 dark:border-dark-600 rounded p-1.5 text-sm bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                    >
                      {TIME_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addReactionRoleRow}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaPlus className="mr-1" /> Add Role
            </button>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <FaCog className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
            Advanced Settings
            {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 border-t border-gray-200 dark:border-dark-600 pt-4">
              {/* Required Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaLock className="text-green-500" /> Required Roles (user must have)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 max-h-32 overflow-y-auto">
                  {(roles || []).filter(r => r.name !== '@everyone').map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRequiredRole(r.id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        (reactionRoleData.requiredRoles || []).includes(r.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-500'
                      }`}
                      style={!(reactionRoleData.requiredRoles || []).includes(r.id) ? { borderLeftColor: getRoleColor(r.id), borderLeftWidth: '3px' } : {}}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forbidden Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaLock className="text-red-500" /> Forbidden Roles (user must NOT have)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 max-h-32 overflow-y-auto">
                  {(roles || []).filter(r => r.name !== '@everyone').map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleForbiddenRole(r.id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        (reactionRoleData.forbiddenRoles || []).includes(r.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-500'
                      }`}
                      style={!(reactionRoleData.forbiddenRoles || []).includes(r.id) ? { borderLeftColor: getRoleColor(r.id), borderLeftWidth: '3px' } : {}}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Requirements */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Account Age (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reactionRoleData.minAccountAge}
                    onChange={e => setReactionRoleData({ ...reactionRoleData, minAccountAge: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Server Time (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reactionRoleData.minServerTime}
                    onChange={e => setReactionRoleData({ ...reactionRoleData, minServerTime: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* DM Notification */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={reactionRoleData.dmNotification}
                    onChange={e => setReactionRoleData({ ...reactionRoleData, dmNotification: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-blue-900 dark:text-blue-200 flex items-center gap-1">
                    <FaEnvelope /> Send DM when role assigned
                  </span>
                </label>
                {reactionRoleData.dmNotification && (
                  <div>
                    <input
                      type="text"
                      value={reactionRoleData.dmMessage}
                      onChange={e => setReactionRoleData({ ...reactionRoleData, dmMessage: e.target.value })}
                      className="w-full border border-blue-300 dark:border-blue-600 rounded-lg p-2 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm"
                      placeholder="DM message (use {role} for role name)"
                    />
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Variables: {'{role}'}, {'{user}'}, {'{server}'}</p>
                  </div>
                )}
              </div>

              {/* Log Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Log Channel (optional)
                </label>
                <select
                  value={reactionRoleData.logChannel}
                  onChange={e => setReactionRoleData({ ...reactionRoleData, logChannel: e.target.value })}
                  className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                >
                  <option value="">No logging</option>
                  {channels.filter(c => c.type === 0).map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Button Preview */}
          {isButtonMode && reactionRoleData.roles.some(r => r.buttonLabel) && (
            <div className="p-4 bg-gray-100 dark:bg-dark-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Button Preview</label>
              <div className="flex flex-wrap gap-2">
                {reactionRoleData.roles.filter(r => r.buttonLabel).map((r, i) => {
                  const style = BUTTON_STYLES.find(s => s.value === r.buttonStyle) || BUTTON_STYLES[0];
                  return (
                    <span key={i} className={`${style.color} text-white px-4 py-2 rounded text-sm font-medium`}>
                      {r.buttonLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {editingPanel ? <FaCheck /> : <FaPlus />}
                {editingPanel ? 'Update Panel' : (isButtonMode ? 'Create Button Panel' : (reactionRoleData.mode === 'new' ? 'Create Panel' : 'Add Reactions'))}
              </>
            )}
          </button>
        </form>

        {/* EXISTING PANELS LIST */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Active Panels ({existingPanels.length})</h3>
          {existingPanels.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">No role panels created yet.</p>
          ) : (
            <div className="space-y-3">
              {existingPanels.map((panel, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg overflow-hidden transition-colors ${
                    panel.enabled === false
                      ? 'border-gray-300 dark:border-dark-500 bg-gray-100 dark:bg-dark-600 opacity-60'
                      : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700'
                  }`}
                >
                  {/* Panel Header */}
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpandPanel(panel.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            panel.interactionType === 'button'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          }`}>
                            {panel.interactionType === 'button' ? 'Buttons' : 'Reactions'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            panel.panelMode === 'single' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                            panel.panelMode === 'verify' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            panel.panelMode === 'limited' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {PANEL_MODES.find(m => m.value === panel.panelMode)?.label || 'Normal'}
                          </span>
                          {panel.enabled === false && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                              Disabled
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          #{getChannelName(panel.channelId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{panel.roles?.length || 0} roles</span>
                      {expandedPanels[panel.id] ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Panel Details (Expanded) */}
                  {expandedPanels[panel.id] && (
                    <div className="border-t border-gray-200 dark:border-dark-600 p-4 space-y-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Message ID: <code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{panel.messageId}</code>
                      </div>

                      {/* Roles list */}
                      <div className="flex flex-wrap gap-2">
                        {panel.roles?.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 px-2 py-1 rounded"
                            style={{ borderLeftColor: getRoleColor(r.roleId), borderLeftWidth: '3px' }}
                          >
                            <span>{panel.interactionType === 'button' ? (r.buttonLabel || 'Button') : (r.originalEmoji || r.emoji)}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{getRoleName(r.roleId)}</span>
                            {r.tempDurationSeconds > 0 && (
                              <span className="text-orange-500 flex items-center gap-0.5">
                                <FaClock className="text-[10px]" />
                                {r.tempDurationSeconds < 3600
                                  ? `${Math.round(r.tempDurationSeconds / 60)}m`
                                  : r.tempDurationSeconds < 86400
                                    ? `${Math.round(r.tempDurationSeconds / 3600)}h`
                                    : `${Math.round(r.tempDurationSeconds / 86400)}d`
                                }
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Requirements info */}
                      {((panel.requiredRoles?.length > 0) || (panel.forbiddenRoles?.length > 0) || panel.minAccountAge > 0 || panel.minServerTime > 0) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                          {panel.requiredRoles?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FaLock className="text-green-500" />
                              Required: {panel.requiredRoles.map(id => getRoleName(id)).join(', ')}
                            </span>
                          )}
                          {panel.forbiddenRoles?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FaLock className="text-red-500" />
                              Forbidden: {panel.forbiddenRoles.map(id => getRoleName(id)).join(', ')}
                            </span>
                          )}
                          {panel.minAccountAge > 0 && <span>Account: {panel.minAccountAge}+ days</span>}
                          {panel.minServerTime > 0 && <span>Server: {panel.minServerTime}+ days</span>}
                        </div>
                      )}

                      {/* Features info */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {panel.dmNotification && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <FaEnvelope /> DM enabled
                          </span>
                        )}
                        {panel.logChannel && (
                          <span className="text-gray-500">
                            Logs: #{getChannelName(panel.logChannel)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-dark-600">
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePanelEnabled(panel); }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                            panel.enabled === false
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                              : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {panel.enabled === false ? <FaToggleOff /> : <FaToggleOn />}
                          {panel.enabled === false ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); loadPanelForEdit(panel); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicatePanel(panel); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200"
                        >
                          <FaCopy /> Duplicate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteReactionPanel(panel.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(isButtonMode || reactionRoleData.mode === 'new' || editingPanel) && (
        <div className="w-full xl:w-96">
          <div className="sticky top-6">
            <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Panel Preview</h3>
            <DiscordPreview
              channelName={getChannelName(reactionRoleData.channelId)}
              embed={{
                title: reactionRoleData.title,
                description: reactionRoleData.description + (reactionRoleData.roles.some(r => r.description)
                  ? '\n\n' + reactionRoleData.roles.filter(r => r.description && r.roleId).map(r =>
                      `${isButtonMode ? r.buttonLabel : r.emoji} - ${r.description}`
                    ).join('\n')
                  : ''
                ),
                color: reactionRoleData.color,
                footer: reactionRoleData.panelMode !== 'normal' ? {
                  text: reactionRoleData.panelMode === 'single' ? 'You can only select one role' :
                        reactionRoleData.panelMode === 'verify' ? 'One-time selection' :
                        reactionRoleData.panelMode === 'limited' ? `Max ${reactionRoleData.maxRoles} roles` : ''
                } : null
              }}
              buttons={isButtonMode ? reactionRoleData.roles.filter(r => r.buttonLabel).map(r => ({
                label: r.buttonLabel,
                style: r.buttonStyle
              })) : []}
            />
          </div>
        </div>
      )}
    </div>
  );
}
