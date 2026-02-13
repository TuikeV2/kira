import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';
import {
  FaEdit, FaTrash, FaPlus, FaShieldAlt, FaCog, FaCheck, FaTimes,
  FaCopy, FaSearch, FaCheckSquare, FaCrown, FaRobot, FaEye,
  FaEyeSlash, FaAt, FaPalette, FaLock, FaUsers, FaChevronDown,
  FaChevronRight, FaGripVertical
} from 'react-icons/fa';
import Modal from '../../ui/Modal';

// Discord permission flags
const PERMISSIONS = {
  ADMINISTRATOR: { value: 0x8n, label: 'Administrator', description: 'Full access to all features', dangerous: true },
  MANAGE_GUILD: { value: 0x20n, label: 'Manage Server', description: 'Edit server settings' },
  MANAGE_ROLES: { value: 0x10000000n, label: 'Manage Roles', description: 'Create and edit roles below this one' },
  MANAGE_CHANNELS: { value: 0x10n, label: 'Manage Channels', description: 'Create, edit, and delete channels' },
  KICK_MEMBERS: { value: 0x2n, label: 'Kick Members', description: 'Remove members from the server' },
  BAN_MEMBERS: { value: 0x4n, label: 'Ban Members', description: 'Permanently ban members' },
  MANAGE_MESSAGES: { value: 0x2000n, label: 'Manage Messages', description: 'Delete messages and add reactions' },
  MENTION_EVERYONE: { value: 0x20000n, label: 'Mention Everyone', description: 'Use @everyone and @here' },
  MUTE_MEMBERS: { value: 0x400000n, label: 'Mute Members', description: 'Mute members in voice channels' },
  DEAFEN_MEMBERS: { value: 0x800000n, label: 'Deafen Members', description: 'Deafen members in voice channels' },
  MOVE_MEMBERS: { value: 0x1000000n, label: 'Move Members', description: 'Move members between voice channels' },
  MANAGE_NICKNAMES: { value: 0x8000000n, label: 'Manage Nicknames', description: 'Change other members nicknames' },
  MANAGE_WEBHOOKS: { value: 0x20000000n, label: 'Manage Webhooks', description: 'Create, edit, and delete webhooks' },
  MANAGE_EMOJIS: { value: 0x40000000n, label: 'Manage Emojis', description: 'Add, edit, and remove custom emojis' },
  VIEW_AUDIT_LOG: { value: 0x80n, label: 'View Audit Log', description: 'View the server audit log' },
  VIEW_CHANNEL: { value: 0x400n, label: 'View Channels', description: 'View text and voice channels' },
  SEND_MESSAGES: { value: 0x800n, label: 'Send Messages', description: 'Send messages in text channels' },
  EMBED_LINKS: { value: 0x4000n, label: 'Embed Links', description: 'Send embedded links' },
  ATTACH_FILES: { value: 0x8000n, label: 'Attach Files', description: 'Upload files and images' },
  READ_MESSAGE_HISTORY: { value: 0x10000n, label: 'Read History', description: 'View older messages' },
  ADD_REACTIONS: { value: 0x40n, label: 'Add Reactions', description: 'Add reactions to messages' },
  USE_EXTERNAL_EMOJIS: { value: 0x40000n, label: 'External Emojis', description: 'Use emojis from other servers' },
  CONNECT: { value: 0x100000n, label: 'Connect', description: 'Connect to voice channels' },
  SPEAK: { value: 0x200000n, label: 'Speak', description: 'Speak in voice channels' },
  STREAM: { value: 0x200n, label: 'Video/Stream', description: 'Share video or stream' },
  USE_VAD: { value: 0x2000000n, label: 'Voice Activity', description: 'Use voice activity detection' },
  PRIORITY_SPEAKER: { value: 0x100n, label: 'Priority Speaker', description: 'Be heard over others' },
  CREATE_INSTANT_INVITE: { value: 0x1n, label: 'Create Invite', description: 'Create server invites' },
  CHANGE_NICKNAME: { value: 0x4000000n, label: 'Change Nickname', description: 'Change own nickname' },
  USE_APPLICATION_COMMANDS: { value: 0x80000000n, label: 'Use Commands', description: 'Use bot slash commands' },
  MODERATE_MEMBERS: { value: 0x10000000000n, label: 'Timeout Members', description: 'Timeout members' },
};

// Predefined colors
const PRESET_COLORS = [
  { name: 'Red', value: 0xE74C3C },
  { name: 'Orange', value: 0xE67E22 },
  { name: 'Yellow', value: 0xF1C40F },
  { name: 'Green', value: 0x2ECC71 },
  { name: 'Teal', value: 0x1ABC9C },
  { name: 'Blue', value: 0x3498DB },
  { name: 'Purple', value: 0x9B59B6 },
  { name: 'Pink', value: 0xE91E63 },
  { name: 'Gray', value: 0x95A5A6 },
  { name: 'Dark', value: 0x34495E },
];

const RoleManagementTab = ({ guildId, setMessage }) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [botHighestPosition, setBotHighestPosition] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPermissions, setShowPermissions] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: '0'
  });

  // Helper function for translations
  const sT = (key, fallback = '') => {
    const res = t(key);
    return typeof res === 'string' ? res : (fallback || key);
  };

  useEffect(() => {
    fetchRoles();
  }, [guildId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getGuildRoles(guildId);
      setRoles(res.data.data.roles || []);
      setBotHighestPosition(res.data.data.botHighestPosition || 0);
    } catch (e) {
      setMessage({ type: 'error', text: sT('roleManagement.fetchError', 'Failed to load roles') });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: 0,
      hoist: false,
      mentionable: false,
      permissions: '0'
    });
    setShowPermissions(false);
  };

  const handleCreate = () => {
    setEditingRole(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions || '0'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await dashboardService.updateRole(guildId, editingRole.id, formData);
        setMessage({ type: 'success', text: sT('roleManagement.updateSuccess', 'Role updated!') });
      } else {
        await dashboardService.createRole(guildId, formData);
        setMessage({ type: 'success', text: sT('roleManagement.createSuccess', 'Role created!') });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error) {
      setMessage({ type: 'error', text: sT('roleManagement.error', 'Operation failed') });
    }
  };

  const handleDelete = async (role) => {
    try {
      await dashboardService.deleteRole(guildId, role.id);
      setMessage({ type: 'success', text: sT('roleManagement.deleteSuccess', 'Role deleted!') });
      setDeleteConfirm(null);
      fetchRoles();
    } catch (e) {
      setMessage({ type: 'error', text: sT('roleManagement.deleteError', 'Failed to delete role') });
    }
  };

  const handleClone = async (role) => {
    try {
      await dashboardService.cloneRole(guildId, role.id);
      setMessage({ type: 'success', text: sT('roleManagement.cloneSuccess', 'Role cloned!') });
      fetchRoles();
    } catch (e) {
      setMessage({ type: 'error', text: sT('roleManagement.error', 'Failed to clone role') });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(sT('roleManagement.confirmBulkDelete', `Delete ${selectedRoles.length} roles?`))) return;
    try {
      await dashboardService.bulkDeleteRoles(guildId, selectedRoles);
      setMessage({ type: 'success', text: sT('roleManagement.bulkDeleteSuccess', 'Roles deleted!') });
      setSelectedRoles([]);
      fetchRoles();
    } catch (e) {
      setMessage({ type: 'error', text: sT('roleManagement.error', 'Failed to delete roles') });
    }
  };

  const toggleSelection = (id) => {
    if (selectedRoles.includes(id)) {
      setSelectedRoles(selectedRoles.filter(r => r !== id));
    } else {
      setSelectedRoles([...selectedRoles, id]);
    }
  };

  const selectAllManageable = () => {
    const manageableIds = roles.filter(r => r.canManage).map(r => r.id);
    if (selectedRoles.length === manageableIds.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(manageableIds);
    }
  };

  const hasPermission = (permValue) => {
    const perms = BigInt(formData.permissions);
    return (perms & permValue) === permValue;
  };

  const togglePermission = (permValue) => {
    const perms = BigInt(formData.permissions);
    const newPerms = hasPermission(permValue) ? perms & ~permValue : perms | permValue;
    setFormData({ ...formData, permissions: newPerms.toString() });
  };

  const intToHex = (color) => {
    if (!color) return '#99AAB5';
    return '#' + color.toString(16).padStart(6, '0');
  };

  const hexToInt = (hex) => {
    return parseInt(hex.replace('#', ''), 16);
  };

  // Filter roles
  const filteredRoles = roles.filter(role => {
    if (!searchQuery) return true;
    return role.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const inputClasses = "w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:placeholder-gray-400 dark:text-white transition-colors";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaShieldAlt className="text-primary-500" />
              {sT('roleManagement.title', 'Role Management')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sT('roleManagement.description', 'Manage server roles, permissions, and hierarchy')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full font-medium">
              {roles.length} {sT('roleManagement.roles', 'roles')}
            </span>
          </div>
        </div>

        {/* Warning when bot cannot manage roles */}
        {botHighestPosition === 0 && roles.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <FaLock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {sT('roleManagement.botNeedsRole', 'Bot needs a role higher in hierarchy to manage other roles. Please assign a role with Manage Roles permission to the bot.')}
              </p>
            </div>
          </div>
        )}

        {/* Search and filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={sT('roleManagement.searchPlaceholder', 'Search roles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
          <button onClick={selectAllManageable} className="btn-secondary flex items-center gap-2 text-sm">
            <FaCheckSquare className="w-4 h-4" />
            <span>{selectedRoles.length > 0 ? sT('common.deselectAll', 'Deselect All') : sT('common.selectAll', 'Select All')}</span>
          </button>
          {selectedRoles.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-danger flex items-center gap-2 text-sm">
              <FaTrash className="w-3 h-3" /> {sT('roleManagement.bulkDelete', 'Delete')} ({selectedRoles.length})
            </button>
          )}
          <div className="flex-1"></div>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2 text-sm shadow-lg shadow-primary-500/20">
            <FaPlus className="w-3 h-3" />
            {sT('roleManagement.createRole', 'Create Role')}
          </button>
        </div>
      </div>

      {/* Role List */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-dark-900/50 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FaShieldAlt className="w-4 h-4" />
            <span>{filteredRoles.length} {sT('roleManagement.rolesFound', 'roles found')}</span>
          </div>
          <span className="text-xs text-gray-400">
            {sT('roleManagement.hierarchyNote', 'Roles are sorted by hierarchy (highest first)')}
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-dark-700">
          {filteredRoles.map(role => (
            <RoleItem
              key={role.id}
              role={role}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              onClone={handleClone}
              selected={selectedRoles.includes(role.id)}
              toggleSelection={toggleSelection}
              intToHex={intToHex}
              botHighestPosition={botHighestPosition}
              t={sT}
            />
          ))}
          {filteredRoles.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FaShieldAlt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{sT('roleManagement.noRoles', 'No roles found')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? sT('roleManagement.editRole', 'Edit Role') : sT('roleManagement.createRole', 'Create Role')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {sT('roleManagement.form.name', 'Role Name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                placeholder="New Role"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {sT('roleManagement.form.color', 'Color')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={intToHex(formData.color)}
                  onChange={(e) => setFormData({ ...formData, color: hexToInt(e.target.value) })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c.value ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: intToHex(c.value) }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hoist}
                onChange={(e) => setFormData({ ...formData, hoist: e.target.checked })}
                className="rounded border-gray-300 text-primary-600"
              />
              <FaEye className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {sT('roleManagement.form.hoist', 'Display separately')}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.mentionable}
                onChange={(e) => setFormData({ ...formData, mentionable: e.target.checked })}
                className="rounded border-gray-300 text-primary-600"
              />
              <FaAt className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {sT('roleManagement.form.mentionable', 'Allow mentions')}
              </span>
            </label>
          </div>

          {/* Permissions Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-500"
            >
              {showPermissions ? <FaChevronDown /> : <FaChevronRight />}
              <FaLock className="w-4 h-4" />
              {sT('roleManagement.form.permissions', 'Permissions')}
            </button>

            {showPermissions && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-900 rounded-lg max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(PERMISSIONS).map(([key, perm]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700 ${perm.dangerous ? 'border border-red-200 dark:border-red-900' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={hasPermission(perm.value)}
                        onChange={() => togglePermission(perm.value)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${perm.dangerous ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {perm.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {perm.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              {sT('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {editingRole ? sT('common.save', 'Save') : sT('common.create', 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={sT('roleManagement.confirmDelete', 'Delete Role')}
        maxWidth="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <FaTrash className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {sT('roleManagement.deleteWarning', 'Are you sure you want to delete')}
          </p>
          <p className="font-bold text-lg" style={{ color: intToHex(deleteConfirm?.color) }}>
            {deleteConfirm?.name}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {sT('roleManagement.deleteNote', 'This action cannot be undone.')}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-4">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
            {sT('common.cancel', 'Cancel')}
          </button>
          <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">
            {sT('common.delete', 'Delete')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// Role Item Component
const RoleItem = ({ role, onEdit, onDelete, onClone, selected, toggleSelection, intToHex, botHighestPosition, t }) => {
  const isEveryone = role.name === '@everyone';
  const isManaged = role.managed;
  const canManage = role.canManage;

  return (
    <div className={`group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors ${!canManage ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {canManage && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelection(role.id)}
            className="rounded border-gray-300 text-primary-600"
          />
        )}

        {/* Role color indicator */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-800"
          style={{ backgroundColor: intToHex(role.color), ringColor: intToHex(role.color) }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {role.name}
            </span>

            {/* Badges */}
            {isManaged && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1">
                <FaRobot className="w-2.5 h-2.5" /> Bot
              </span>
            )}
            {role.hoist && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded flex items-center gap-1">
                <FaEye className="w-2.5 h-2.5" /> Hoisted
              </span>
            )}
            {role.mentionable && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
                <FaAt className="w-2.5 h-2.5" /> Mentionable
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span>Position: {role.position}</span>
            {!canManage && !isEveryone && (
              <span className="text-amber-500 flex items-center gap-1">
                <FaLock className="w-3 h-3" /> {t('roleManagement.cannotManage', 'Cannot manage')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onClone(role)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            title={t('common.clone', 'Clone')}
          >
            <FaCopy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(role)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            title={t('common.edit', 'Edit')}
          >
            <FaCog className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(role)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={t('common.delete', 'Delete')}
          >
            <FaTrash className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleManagementTab;
