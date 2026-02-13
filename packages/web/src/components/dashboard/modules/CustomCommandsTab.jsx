import React, { useState, useEffect } from 'react';
import { FaTerminal, FaPlus, FaTrash, FaEdit, FaTags, FaUserShield, FaImage, FaRobot, FaInfoCircle } from 'react-icons/fa';
import { customCommandService, dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function CustomCommandsTab({ guildId, setMessage }) {
  const { t } = useTranslation();
  const [commands, setCommands] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showVariables, setShowVariables] = useState(false);

  const [formData, setFormData] = useState({
    commandName: '',
    response: '',
    embedEnabled: false,
    embedTitle: '',
    embedColor: '#5865F2',
    embedImage: '',
    aliases: '',
    allowedRoles: [],
    isAutoResponse: false
  });

  useEffect(() => {
    fetchCommands();
    fetchRoles();
  }, [guildId]);

  const fetchCommands = async () => {
    try {
      setLoading(true);
      const response = await customCommandService.getCommands(guildId);
      const commandsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setCommands(commandsData);
    } catch (error) {
      setMessage({ type: 'error', text: t('customCommands.fetchError') || 'Failed to load commands' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await dashboardService.getGuildRoles(guildId);
      const rolesData = response.data?.data || response.data || [];
      // Filter out @everyone and bot roles
      const filteredRoles = rolesData.filter(r => r.name !== '@everyone' && !r.managed);
      setRoles(filteredRoles);
    } catch (error) {
      // fetch error handled silently
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!formData.commandName || !formData.response) {
        setMessage({ type: 'error', text: t('customCommands.requiredFields') || 'Command name and response are required' });
        setSaving(false);
        return;
      }

      // Parse aliases from comma-separated string to array
      const aliasesArray = formData.aliases
        ? formData.aliases.split(',').map(a => a.trim()).filter(a => a)
        : [];

      const dataToSend = {
        ...formData,
        aliases: aliasesArray
      };

      if (editingId) {
        await customCommandService.updateCommand(guildId, editingId, dataToSend);
        setMessage({ type: 'success', text: t('customCommands.updated') || 'Command updated!' });
      } else {
        await customCommandService.createCommand(guildId, dataToSend);
        setMessage({ type: 'success', text: t('customCommands.created') || 'Command created!' });
      }

      resetForm();
      fetchCommands();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save command' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (command) => {
    setEditingId(command.id);
    setFormData({
      commandName: command.commandName,
      response: command.response,
      embedEnabled: command.embedEnabled || false,
      embedTitle: command.embedTitle || '',
      embedColor: command.embedColor || '#5865F2',
      embedImage: command.embedImage || '',
      aliases: (command.aliases || []).join(', '),
      allowedRoles: command.allowedRoles || [],
      isAutoResponse: command.isAutoResponse || false
    });
  };

  const handleDelete = async (commandId) => {
    if (!window.confirm(t('customCommands.deleteConfirm') || 'Delete this command?')) return;

    try {
      await customCommandService.deleteCommand(guildId, commandId);
      setMessage({ type: 'success', text: t('customCommands.deleted') || 'Command deleted!' });
      fetchCommands();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete command' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      commandName: '',
      response: '',
      embedEnabled: false,
      embedTitle: '',
      embedColor: '#5865F2',
      embedImage: '',
      aliases: '',
      allowedRoles: [],
      isAutoResponse: false
    });
  };

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(roleId)
        ? prev.allowedRoles.filter(id => id !== roleId)
        : [...prev.allowedRoles, roleId]
    }));
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      response: prev.response + variable
    }));
  };

  // Process variables for preview
  const processPreview = (text) => {
    return text
      .replace(/{user}/g, '@ExampleUser')
      .replace(/{username}/g, 'ExampleUser')
      .replace(/{displayName}/g, 'Example User')
      .replace(/{server}/g, 'My Server')
      .replace(/{channel}/g, '#general')
      .replace(/{channelName}/g, 'general')
      .replace(/{memberCount}/g, '1234')
      .replace(/{args}/g, 'example arguments')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 dark:text-gray-400">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-6">
        {/* CREATOR FORM */}
        <form onSubmit={handleCreateOrUpdate} className="card p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FaTerminal className="mr-2 text-blue-500" />
            {editingId ? t('customCommands.editCommand') || 'Edit Command' : t('customCommands.createCommand') || 'Create Command'}
          </h2>

          {/* Command Name */}
          <div>
            <label className="label">{t('customCommands.name') || 'Command Name'}</label>
            <input
              type="text"
              value={formData.commandName}
              onChange={(e) => setFormData({ ...formData, commandName: e.target.value.toLowerCase().replace(/\s/g, '') })}
              className="input"
              placeholder="e.g. welcome, rules, info"
              disabled={editingId !== null}
              maxLength={50}
              required
            />
          </div>

          {/* Auto Response Toggle */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <input
              type="checkbox"
              id="isAutoResponse"
              checked={formData.isAutoResponse}
              onChange={(e) => setFormData({ ...formData, isAutoResponse: e.target.checked })}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="isAutoResponse" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <FaRobot className="text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {t('customCommands.autoResponse') || 'Auto-Response'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t('customCommands.autoResponseDesc') || 'Trigger when keyword appears anywhere in message (not just with prefix)'}
              </p>
            </label>
          </div>

          {/* Aliases */}
          <div>
            <label className="label flex items-center gap-2">
              <FaTags className="text-gray-400" />
              {t('customCommands.aliases') || 'Aliases'} <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              className="input"
              placeholder="alias1, alias2, alias3"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('customCommands.aliasesDesc') || 'Comma-separated alternative triggers (max 10)'}
            </p>
          </div>

          {/* Response */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">{t('customCommands.response') || 'Response'}</label>
              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <FaInfoCircle />
                {t('customCommands.variables') || 'Variables'}
              </button>
            </div>

            {showVariables && (
              <div className="mb-2 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg text-xs">
                <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">{t('customCommands.availableVariables') || 'Click to insert:'}</p>
                <div className="flex flex-wrap gap-1">
                  {['{user}', '{username}', '{displayName}', '{server}', '{channel}', '{channelName}', '{memberCount}', '{args}', '{date}', '{time}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={formData.response}
              onChange={(e) => setFormData({ ...formData, response: e.target.value })}
              className="input resize-none"
              rows="4"
              placeholder={t('customCommands.responsePlaceholder') || 'What the bot should respond with...'}
              required
            />
          </div>

          {/* Role Restrictions */}
          <div>
            <label className="label flex items-center gap-2">
              <FaUserShield className="text-gray-400" />
              {t('customCommands.allowedRoles') || 'Allowed Roles'} <span className="text-xs text-gray-400">(empty = everyone)</span>
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg max-h-32 overflow-y-auto">
              {roles.length === 0 ? (
                <span className="text-xs text-gray-400">{t('common.loading')}</span>
              ) : (
                roles.slice(0, 20).map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`px-2 py-1 text-xs rounded-full transition-all ${
                      formData.allowedRoles.includes(role.id)
                        ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-500'
                    }`}
                    style={formData.allowedRoles.includes(role.id) && role.color ? { backgroundColor: `${role.color}30`, borderColor: role.color } : {}}
                  >
                    {role.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Embed Toggle */}
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <input
              type="checkbox"
              id="embedEnabled"
              checked={formData.embedEnabled}
              onChange={(e) => setFormData({ ...formData, embedEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="embedEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('customCommands.sendAsEmbed') || 'Send as Embed (Rich Message)'}
            </label>
          </div>

          {/* Embed Options */}
          {formData.embedEnabled && (
            <div className="space-y-3 pl-4 border-l-4 border-purple-300 dark:border-purple-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('customCommands.embedTitle') || 'Embed Title'}</label>
                  <input
                    type="text"
                    value={formData.embedTitle}
                    onChange={(e) => setFormData({ ...formData, embedTitle: e.target.value })}
                    className="input"
                    placeholder="Optional title"
                  />
                </div>
                <div>
                  <label className="label">{t('customCommands.embedColor') || 'Color'}</label>
                  <input
                    type="color"
                    value={formData.embedColor}
                    onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-dark-600"
                  />
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <FaImage className="text-gray-400" />
                  {t('customCommands.embedImage') || 'Image URL'}
                </label>
                <input
                  type="url"
                  value={formData.embedImage}
                  onChange={(e) => setFormData({ ...formData, embedImage: e.target.value })}
                  className="input"
                  placeholder="https://example.com/image.png"
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 font-bold py-2.5 rounded-lg text-white transition-all ${
                saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? t('common.saving') || 'Saving...' : editingId ? t('customCommands.update') || 'Update' : t('customCommands.create') || 'Create'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            )}
          </div>
        </form>

        {/* COMMANDS LIST */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">
            {t('customCommands.activeCommands') || 'Active Commands'} ({commands.length})
          </h3>
          {commands.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">{t('customCommands.noCommands') || 'No commands yet.'}</p>
          ) : (
            <div className="space-y-3">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-gray-50 dark:bg-dark-700 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {cmd.isAutoResponse ? `"${cmd.commandName}"` : `!${cmd.commandName}`}
                        </span>
                        {cmd.isAutoResponse && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                            Auto
                          </span>
                        )}
                        {cmd.embedEnabled && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                            Embed
                          </span>
                        )}
                        {cmd.aliases && cmd.aliases.length > 0 && (
                          <span className="text-xs bg-gray-200 dark:bg-dark-500 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                            +{cmd.aliases.length} aliases
                          </span>
                        )}
                        {cmd.allowedRoles && cmd.allowedRoles.length > 0 && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                            {cmd.allowedRoles.length} roles
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {cmd.usageCount}x
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{cmd.response}</p>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => handleEdit(cmd)}
                        className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(cmd.id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW */}
      {formData.response && (
        <div className="w-full xl:w-96">
          <div className="sticky top-6">
            <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-sm">{t('dashboard.preview') || 'Preview'}</h3>
            <div className="bg-[#313338] rounded-lg p-4 text-white font-['Whitney']">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold flex-shrink-0">
                  K
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">KiraEvo Bot</span>
                    <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded text-white font-semibold">BOT</span>
                  </div>
                  {formData.embedEnabled ? (
                    <div
                      className="border-l-4 rounded p-3 mt-1"
                      style={{ borderColor: formData.embedColor, backgroundColor: '#2b2d31' }}
                    >
                      {formData.embedTitle && (
                        <div className="font-semibold mb-2">{processPreview(formData.embedTitle)}</div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words">{processPreview(formData.response)}</div>
                      {formData.embedImage && (
                        <img
                          src={formData.embedImage}
                          alt="Embed"
                          className="mt-2 max-w-full rounded"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">{processPreview(formData.response)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Variables Reference */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-800 rounded-lg text-xs">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('customCommands.variablesRef') || 'Variables Reference:'}</p>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <p><code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{'{user}'}</code> - @mention</p>
                <p><code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{'{username}'}</code> - username</p>
                <p><code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{'{server}'}</code> - server name</p>
                <p><code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{'{memberCount}'}</code> - member count</p>
                <p><code className="bg-gray-200 dark:bg-dark-600 px-1 rounded">{'{args}'}</code> - text after command</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
