import React, { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../../services/api.service';
import { useTranslation } from '../../../contexts/LanguageContext';
import {
  FaEdit, FaTrash, FaPlus, FaHashtag, FaVolumeUp, FaFolder,
  FaFolderOpen, FaCog, FaGripVertical, FaExclamationTriangle,
  FaShieldAlt, FaSlidersH, FaCheck, FaTimes, FaSlash, FaCopy,
  FaSync, FaArchive, FaThumbtack, FaCloudDownloadAlt, FaCloudUploadAlt,
  FaBullhorn, FaListAlt, FaBroadcastTower, FaSearch, FaChevronDown,
  FaDatabase, FaHistory, FaDownload, FaUpload, FaCheckSquare,
  FaFilter, FaChevronRight, FaTh, FaMicrophone, FaUsers, FaLock
} from 'react-icons/fa';
import Modal from '../../ui/Modal';
import FormField from '../../ui/FormField';

const ChannelManagementTab = ({ guildId, setMessage }) => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [backupData, setBackupData] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [webhooks, setWebhooks] = useState([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [showPinsModal, setShowPinsModal] = useState(false);
  const [pins, setPins] = useState([]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const roleDropdownRef = useRef(null);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [restoringBackup, setRestoringBackup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelTypeFilter, setChannelTypeFilter] = useState('all');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'

  const [formData, setFormData] = useState({
    name: '',
    type: 0,
    parentId: '',
    topic: '',
    nsfw: false,
    rateLimitPerUser: 0,
    userLimit: 0,
    bitrate: 64000,
    position: 0,
    permissionOverwrites: []
  });

// Funkcja pomocnicza do bezpiecznego pobierania tekstów
const sT = (key, fallback = '') => {
  const res = t(key);
  return typeof res === 'string' ? res : (fallback || key);
};

const TEXT_PERMISSIONS = [
  { label: sT('channelManagement.permNames.VIEW_CHANNEL'), value: 1024n },
  { label: sT('channelManagement.permNames.SEND_MESSAGES'), value: 2048n },
  { label: sT('channelManagement.permNames.SEND_TTS_MESSAGES'), value: 4096n },
  { label: sT('channelManagement.permNames.MANAGE_MESSAGES'), value: 8192n },
  { label: sT('channelManagement.permNames.EMBED_LINKS'), value: 16384n },
  { label: sT('channelManagement.permNames.ATTACH_FILES'), value: 32768n },
  { label: sT('channelManagement.permNames.READ_MESSAGE_HISTORY'), value: 65536n },
  { label: sT('channelManagement.permNames.MENTION_EVERYONE'), value: 131072n },
  { label: sT('channelManagement.permNames.USE_EXTERNAL_EMOJIS'), value: 262144n },
  { label: sT('channelManagement.permNames.ADD_REACTIONS'), value: 64n },
  { label: sT('channelManagement.permNames.USE_EXTERNAL_STICKERS'), value: 137438953472n },
  { label: sT('channelManagement.permNames.USE_SLASH_COMMANDS'), value: 2147483648n },
  { label: sT('channelManagement.permNames.CREATE_PUBLIC_THREADS'), value: 34359738368n },
  { label: sT('channelManagement.permNames.CREATE_PRIVATE_THREADS'), value: 68719476736n },
  { label: sT('channelManagement.permNames.SEND_MESSAGES_IN_THREADS'), value: 274877906944n },
];

const VOICE_PERMISSIONS = [
  { label: sT('channelManagement.permNames.VIEW_CHANNEL'), value: 1024n },
  { label: sT('channelManagement.permNames.CONNECT'), value: 1048576n },
  { label: sT('channelManagement.permNames.SPEAK'), value: 2097152n },
  { label: sT('channelManagement.permNames.STREAM'), value: 512n },
  { label: sT('channelManagement.permNames.MUTE_MEMBERS'), value: 4194304n },
  { label: sT('channelManagement.permNames.DEAFEN_MEMBERS'), value: 8388608n },
  { label: sT('channelManagement.permNames.MOVE_MEMBERS'), value: 16777216n },
  { label: sT('channelManagement.permNames.USE_VAD'), value: 33554432n },
  { label: sT('channelManagement.permNames.PRIORITY_SPEAKER'), value: 256n },
  { label: sT('channelManagement.permNames.USE_SOUNDBOARD'), value: 4398046511104n },
  { label: sT('channelManagement.permNames.USE_EXTERNAL_SOUNDS'), value: 35184372088832n },
];

const GENERAL_PERMISSIONS = [
  { label: sT('channelManagement.permNames.MANAGE_CHANNELS'), value: 16n },
  { label: sT('channelManagement.permNames.MANAGE_PERMISSIONS'), value: 268435456n },
  { label: sT('channelManagement.permNames.MANAGE_WEBHOOKS'), value: 536870912n },
  { label: sT('channelManagement.permNames.CREATE_INSTANT_INVITE'), value: 1n },
];

  const getPermissionsForChannelType = (type) => {
    if (type === 2 || type === 13) return [...GENERAL_PERMISSIONS, ...VOICE_PERMISSIONS];
    if (type === 4) return GENERAL_PERMISSIONS;
    return [...GENERAL_PERMISSIONS, ...TEXT_PERMISSIONS];
  };

  const refreshData = async () => {
    try {
      const [channelsRes, rolesRes] = await Promise.all([
        dashboardService.getGuildChannels(guildId),
        dashboardService.getGuildRoles(guildId)
      ]);
      setChannels(channelsRes.data.data);
      // API returns { roles, botHighestPosition }, extract roles array
      const rolesData = rolesRes.data.data;
      setRoles(Array.isArray(rolesData) ? rolesData : (rolesData?.roles || []));
    } catch (error) {
      setMessage({ type: 'error', text: t('dashboard.loadFailed') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [guildId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
      setFormData({
        name: '',
        type: 0,
        parentId: '',
        topic: '',
        nsfw: false,
        rateLimitPerUser: 0,
        userLimit: 0,
        bitrate: 64000,
        position: 0,
        permissionOverwrites: []
      });
      setActiveTab('general');
  };

  const handleCreate = (preselectedParentId = '') => {
    setEditingChannel(null);
    resetForm();
    setFormData(prev => ({ ...prev, parentId: preselectedParentId }));
    setIsModalOpen(true);
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId || '',
      topic: channel.topic || '',
      nsfw: channel.nsfw || false,
      rateLimitPerUser: channel.rateLimitPerUser || 0,
      userLimit: channel.userLimit || 0,
      bitrate: channel.bitrate || 64000,
      position: channel.position,
      permissionOverwrites: channel.permissionOverwrites || []
    });
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await dashboardService.deleteChannel(guildId, id);
      setMessage({ type: 'success', text: t('channelManagement.deleteSuccess') });
      setDeleteConfirm(null);
      refreshData();
    } catch (error) {
      setMessage({ type: 'error', text: t('channelManagement.deleteError') });
    }
  };

  const handleBulkDelete = async () => {
      if (!confirm(t('channelManagement.confirmBulkDelete'))) return;
      try {
          await dashboardService.bulkDeleteChannels(guildId, selectedChannels);
          setMessage({ type: 'success', text: t('channelManagement.deleteSuccess') });
          setSelectedChannels([]);
          refreshData();
      } catch(e) {
          setMessage({ type: 'error', text: t('channelManagement.deleteError') });
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        parentId: formData.parentId === '' ? null : formData.parentId
      };

      if (editingChannel) {
        await dashboardService.updateChannel(guildId, editingChannel.id, payload);
        setMessage({ type: 'success', text: t('channelManagement.updateSuccess') });
      } else {
        await dashboardService.createChannel(guildId, payload);
        setMessage({ type: 'success', text: t('channelManagement.createSuccess') });
      }
      setIsModalOpen(false);
      refreshData();
    } catch (error) {
      setMessage({ type: 'error', text: t('channelManagement.error') });
    }
  };

const handlePermissionChange = (roleId, permissionValue, state, forceAdd = false) => {
  const newOverwrites = [...formData.permissionOverwrites];
  let overwriteIndex = newOverwrites.findIndex(o => o.id === roleId);

  if (overwriteIndex === -1 && (state !== 'inherit' || forceAdd)) {
    newOverwrites.push({ id: roleId, type: 0, allow: '0', deny: '0' });
    overwriteIndex = newOverwrites.length - 1;
  }

  if (overwriteIndex !== -1) {
    const overwrite = { ...newOverwrites[overwriteIndex] };
    let allow = BigInt(overwrite.allow);
    let deny = BigInt(overwrite.deny);
    const perm = BigInt(permissionValue);

    if (!forceAdd) {
      if (state === 'allow') {
        allow |= perm;
        deny &= ~perm;
      } else if (state === 'deny') {
        deny |= perm;
        allow &= ~perm;
      } else {
        allow &= ~perm;
        deny &= ~perm;
      }

      overwrite.allow = allow.toString();
      overwrite.deny = deny.toString();

      if (allow === 0n && deny === 0n) {
        newOverwrites.splice(overwriteIndex, 1);
      } else {
        newOverwrites[overwriteIndex] = overwrite;
      }
    }

    setFormData({ ...formData, permissionOverwrites: newOverwrites });
  }
};

  const getPermissionState = (roleId, permissionValue) => {
      const overwrite = formData.permissionOverwrites.find(o => o.id === roleId);
      if (!overwrite) return 'inherit';
      
      const allow = BigInt(overwrite.allow);
      const deny = BigInt(overwrite.deny);
      const perm = BigInt(permissionValue);

      if ((allow & perm) === perm) return 'allow';
      if ((deny & perm) === perm) return 'deny';
      return 'inherit';
  };

  const handleClone = async (channel) => {
      try {
          await dashboardService.cloneChannel(guildId, channel.id);
          setMessage({ type: 'success', text: t('channelManagement.cloneSuccess') });
          refreshData();
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const handleSync = async (channel) => {
      try {
          await dashboardService.syncChannelPermissions(guildId, channel.id);
          setMessage({ type: 'success', text: t('channelManagement.syncSuccess') });
          refreshData();
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const handleArchive = async (channel) => {
      try {
          await dashboardService.archiveChannel(guildId, channel.id);
          setMessage({ type: 'success', text: t('channelManagement.archiveSuccess') });
          refreshData();
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const openBackupsModal = async () => {
      setShowBackupsModal(true);
      setLoadingBackups(true);
      try {
          const res = await dashboardService.listBackups(guildId);
          setBackups(res.data.data || []);
      } catch (e) {
          setMessage({ type: 'error', text: t('channelManagement.error') });
      } finally {
          setLoadingBackups(false);
      }
  };

  const handleCreateBackup = async () => {
      try {
          const name = newBackupName || `Backup ${new Date().toLocaleString()}`;
          await dashboardService.createBackup(guildId, name);
          setMessage({ type: 'success', text: t('channelManagement.backupCreated') || 'Backup created!' });
          setNewBackupName('');
          // Refresh backup list
          const res = await dashboardService.listBackups(guildId);
          setBackups(res.data.data || []);
      } catch (e) {
          setMessage({ type: 'error', text: t('channelManagement.error') });
      }
  };

  const handleDeleteBackup = async (backupId) => {
      if (!confirm(t('channelManagement.confirmDeleteBackup') || 'Delete this backup?')) return;
      try {
          await dashboardService.deleteBackup(guildId, backupId);
          setBackups(backups.filter(b => b.id !== backupId));
          setMessage({ type: 'success', text: t('channelManagement.backupDeleted') || 'Backup deleted' });
      } catch (e) {
          setMessage({ type: 'error', text: t('channelManagement.error') });
      }
  };

  const handleRestoreBackup = async (backupId) => {
      if (!confirm(t('channelManagement.confirmRestore') || 'Restore this backup? This will create new channels and roles.')) return;
      setRestoringBackup(backupId);
      try {
          await dashboardService.restoreBackup(guildId, backupId);
          setMessage({ type: 'success', text: t('channelManagement.restoreSuccess') });
          setShowBackupsModal(false);
          refreshData();
      } catch (e) {
          setMessage({ type: 'error', text: t('channelManagement.error') });
      } finally {
          setRestoringBackup(null);
      }
  };

  const selectAllChannels = () => {
      const allIds = channels.map(c => c.id);
      if (selectedChannels.length === allIds.length) {
          setSelectedChannels([]);
      } else {
          setSelectedChannels(allIds);
      }
  };

  const openWebhooks = async (channel) => {
      setEditingChannel(channel);
      try {
          const res = await dashboardService.getChannelWebhooks(guildId, channel.id);
          setWebhooks(res.data);
          setShowWebhooksModal(true);
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const createWebhook = async () => {
      if (!newWebhookName) return;
      try {
          await dashboardService.createWebhook(guildId, editingChannel.id, newWebhookName);
          const res = await dashboardService.getChannelWebhooks(guildId, editingChannel.id);
          setWebhooks(res.data);
          setNewWebhookName('');
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const deleteWebhook = async (id) => {
      try {
          await dashboardService.deleteWebhook(guildId, editingChannel.id, id);
          setWebhooks(webhooks.filter(w => w.id !== id));
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const openPins = async (channel) => {
      setEditingChannel(channel);
      try {
          const res = await dashboardService.getPinnedMessages(guildId, channel.id);
          setPins(res.data);
          setShowPinsModal(true);
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const unpinMessage = async (id) => {
      try {
          await dashboardService.unpinMessage(guildId, editingChannel.id, id);
          setPins(pins.filter(p => p.id !== id));
      } catch (e) { setMessage({ type: 'error', text: t('channelManagement.error') }); }
  };

  const toggleSelection = (id) => {
      const channel = channels.find(c => c.id === id);
      const isCategory = channel && channel.type === 4;

      if (isCategory) {
          // Get all child channels of this category
          const childChannelIds = channels
              .filter(c => c.parentId === id)
              .map(c => c.id);

          if (selectedChannels.includes(id)) {
              // Deselect category and all its children
              setSelectedChannels(selectedChannels.filter(c => c !== id && !childChannelIds.includes(c)));
          } else {
              // Select category and all its children
              const newSelection = [...selectedChannels, id, ...childChannelIds.filter(cId => !selectedChannels.includes(cId))];
              setSelectedChannels(newSelection);
          }
      } else {
          // Regular channel toggle
          if (selectedChannels.includes(id)) {
              setSelectedChannels(selectedChannels.filter(c => c !== id));
          } else {
              setSelectedChannels([...selectedChannels, id]);
          }
      }
  };

  // Ensure channels is an array
  const safeChannels = Array.isArray(channels) ? channels : [];

  const categories = safeChannels.filter(c => c && c.type === 4).sort((a, b) => (a.position || 0) - (b.position || 0));
  const noCategoryChannels = safeChannels.filter(c => c && !c.parentId && c.type !== 4).sort((a, b) => (a.position || 0) - (b.position || 0));

  const inputClasses = "w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500 transition-colors";

  // Statistics
  const stats = {
    total: safeChannels.length,
    categories: safeChannels.filter(c => c && c.type === 4).length,
    text: safeChannels.filter(c => c && c.type === 0).length,
    voice: safeChannels.filter(c => c && c.type === 2).length,
    announcement: safeChannels.filter(c => c && c.type === 5).length,
    forum: safeChannels.filter(c => c && c.type === 15).length,
    stage: safeChannels.filter(c => c && c.type === 13).length,
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (categoryId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Filter channels
  const filterChannel = (channel) => {
    if (!channel || !channel.name) return false;
    // Search filter
    if (searchQuery && !channel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filter
    if (channelTypeFilter !== 'all') {
      if (channelTypeFilter === 'text' && channel.type !== 0) return false;
      if (channelTypeFilter === 'voice' && channel.type !== 2) return false;
      if (channelTypeFilter === 'announcement' && channel.type !== 5) return false;
      if (channelTypeFilter === 'forum' && channel.type !== 15) return false;
      if (channelTypeFilter === 'stage' && channel.type !== 13) return false;
      if (channelTypeFilter === 'category' && channel.type !== 4) return false;
    }
    return true;
  };

  const filteredNoCategoryChannels = noCategoryChannels.filter(filterChannel);
  const filteredCategories = channelTypeFilter === 'all' || channelTypeFilter === 'category'
    ? categories.filter(c => c && c.name && (searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : true))
    : [];

  const getChannelsInCategory = (categoryId) => {
    return safeChannels
      .filter(c => c && c.parentId === categoryId)
      .filter(filterChannel)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const CHANNEL_TYPE_FILTERS = [
    { key: 'all', icon: FaTh, color: 'gray' },
    { key: 'text', icon: FaHashtag, color: 'blue' },
    { key: 'voice', icon: FaVolumeUp, color: 'green' },
    { key: 'announcement', icon: FaBullhorn, color: 'yellow' },
    { key: 'forum', icon: FaListAlt, color: 'purple' },
    { key: 'stage', icon: FaBroadcastTower, color: 'pink' },
    { key: 'category', icon: FaFolder, color: 'orange' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Safety check for channels array
  if (!Array.isArray(channels)) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Error: Invalid channel data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title & Description */}
            <div className="flex items-start gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <FaHashtag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {t('channelManagement.title')}
                </h2>
                <p className="text-blue-100 mt-1 text-sm md:text-base">
                  {t('channelManagement.subtitle')}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-blue-100 uppercase tracking-wide">{t('channelManagement.stats.total') || 'Total'}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.text}</div>
                <div className="text-xs text-blue-100 uppercase tracking-wide flex items-center gap-1">
                  <FaHashtag className="w-3 h-3" /> {t('channelManagement.stats.text') || 'Text'}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.voice}</div>
                <div className="text-xs text-blue-100 uppercase tracking-wide flex items-center gap-1">
                  <FaVolumeUp className="w-3 h-3" /> {t('channelManagement.stats.voice') || 'Voice'}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.categories}</div>
                <div className="text-xs text-blue-100 uppercase tracking-wide flex items-center gap-1">
                  <FaFolder className="w-3 h-3" /> {t('channelManagement.stats.categories') || 'Categories'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('channelManagement.searchChannels') || 'Search channels...'}
              className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-900 dark:border-dark-700 dark:text-white transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-900 p-1 rounded-xl overflow-x-auto">
            {CHANNEL_TYPE_FILTERS.map(filter => {
              const Icon = filter.icon;
              const isActive = channelTypeFilter === filter.key;
              const colorClasses = {
                gray: isActive ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-700',
                blue: isActive ? 'bg-blue-500 text-white' : 'text-blue-500 hover:text-blue-600',
                green: isActive ? 'bg-green-500 text-white' : 'text-green-500 hover:text-green-600',
                yellow: isActive ? 'bg-yellow-500 text-white' : 'text-yellow-500 hover:text-yellow-600',
                purple: isActive ? 'bg-purple-500 text-white' : 'text-purple-500 hover:text-purple-600',
                pink: isActive ? 'bg-pink-500 text-white' : 'text-pink-500 hover:text-pink-600',
                orange: isActive ? 'bg-orange-500 text-white' : 'text-orange-500 hover:text-orange-600',
              };
              return (
                <button
                  key={filter.key}
                  onClick={() => setChannelTypeFilter(filter.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${colorClasses[filter.color]} ${isActive ? 'shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-dark-700'}`}
                  title={t(`channelManagement.filter.${filter.key}`) || filter.key}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline capitalize">{t(`channelManagement.filter.${filter.key}`) || filter.key}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
          <button onClick={selectAllChannels} className="btn-secondary flex items-center gap-2 text-sm" title={t('channelManagement.selectAll') || 'Select All'}>
            <FaCheckSquare className="w-4 h-4" />
            <span>{selectedChannels.length === safeChannels.length ? (t('channelManagement.deselectAll') || 'Deselect All') : (t('channelManagement.selectAll') || 'Select All')}</span>
          </button>
          {selectedChannels.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-danger flex items-center gap-2 text-sm">
              <FaTrash className="w-3 h-3" /> {t('channelManagement.bulkDelete')} ({selectedChannels.length})
            </button>
          )}
          <div className="flex-1"></div>
          <button onClick={openBackupsModal} className="btn-secondary flex items-center gap-2 text-sm">
            <FaDatabase className="w-4 h-4" /> <span className="hidden sm:inline">{t('channelManagement.backups.title') || 'Backups'}</span>
          </button>
          <button
            onClick={() => {
              setEditingChannel(null);
              resetForm();
              setFormData(prev => ({ ...prev, type: 4 }));
              setIsModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FaFolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('channelManagement.createCategory')}</span>
          </button>
          <button onClick={() => handleCreate()} className="btn-primary flex items-center gap-2 text-sm shadow-lg shadow-primary-500/20">
            <FaPlus className="w-3 h-3" />
            {t('channelManagement.createChannel')}
          </button>
        </div>
      </div>

      {/* Channel List */}
      <div className="card overflow-hidden">
        {/* List Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-dark-900/50 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FaTh className="w-4 h-4" />
            <span>
              {searchQuery || channelTypeFilter !== 'all'
                ? `${filteredNoCategoryChannels.length + filteredCategories.reduce((acc, cat) => acc + getChannelsInCategory(cat.id).length, 0)} ${t('channelManagement.resultsFound') || 'results found'}`
                : `${safeChannels.length} ${t('channelManagement.channels') || 'channels'}`
              }
            </span>
          </div>
          {(searchQuery || channelTypeFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setChannelTypeFilter('all'); }}
              className="text-xs text-primary-500 hover:text-primary-600 font-medium"
            >
              {t('channelManagement.clearFilters') || 'Clear filters'}
            </button>
          )}
        </div>

        <div className="p-4 space-y-2 min-h-[400px]">
          {/* Channels without category */}
          {filteredNoCategoryChannels.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                <FaHashtag className="w-3 h-3" />
                {t('channelManagement.uncategorized') || 'Uncategorized'}
                <span className="ml-auto bg-gray-200 dark:bg-dark-700 px-2 py-0.5 rounded-full text-[10px]">
                  {filteredNoCategoryChannels.length}
                </span>
              </div>
              <div className="space-y-1">
                {filteredNoCategoryChannels.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    onEdit={handleEdit}
                    onDelete={setDeleteConfirm}
                    onClone={handleClone}
                    onSync={handleSync}
                    onArchive={handleArchive}
                    onWebhooks={openWebhooks}
                    onPins={openPins}
                    selected={selectedChannels.includes(channel.id)}
                    toggleSelection={toggleSelection}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categories with channels */}
          {filteredCategories.map(category => {
            const categoryChannels = getChannelsInCategory(category.id);
            const isCollapsed = collapsedCategories[category.id];

            return (
              <div key={category.id} className="mb-4">
                <CategoryItem
                  category={category}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  onCreateChannel={() => handleCreate(category.id)}
                  channelCount={safeChannels.filter(c => c && c.parentId === category.id).length}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleCategoryCollapse(category.id)}
                  selected={selectedChannels.includes(category.id)}
                  toggleSelection={toggleSelection}
                  t={t}
                />

                {!isCollapsed && (
                  <div className="mt-1 space-y-1 relative ml-4 pl-4 border-l-2 border-gray-200 dark:border-dark-700">
                    {categoryChannels.map(channel => (
                      <ChannelItem
                        key={channel.id}
                        channel={channel}
                        onEdit={handleEdit}
                        onDelete={setDeleteConfirm}
                        onClone={handleClone}
                        onSync={handleSync}
                        onArchive={handleArchive}
                        onWebhooks={openWebhooks}
                        onPins={openPins}
                        selected={selectedChannels.includes(channel.id)}
                        toggleSelection={toggleSelection}
                        isNested
                        t={t}
                      />
                    ))}
                    {categoryChannels.length === 0 && !searchQuery && channelTypeFilter === 'all' && (
                      <div className="py-3 px-4 text-xs text-gray-400 dark:text-gray-600 italic bg-gray-50 dark:bg-dark-900/30 rounded-lg">
                        {t('channelManagement.emptyCategory')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty State */}
          {safeChannels.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-dark-700 dark:to-dark-800 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FaHashtag className="text-gray-300 dark:text-gray-600 text-4xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('channelManagement.noChannels')}</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">{t('channelManagement.noChannelsDesc')}</p>
              <button onClick={() => handleCreate()} className="btn-primary mt-6 inline-flex items-center gap-2">
                <FaPlus className="w-3 h-3" />
                {t('channelManagement.createFirstChannel') || 'Create your first channel'}
              </button>
            </div>
          )}

          {/* No Results State */}
          {safeChannels.length > 0 && filteredNoCategoryChannels.length === 0 && filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-gray-100 dark:bg-dark-700 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-gray-400 dark:text-gray-500 text-xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('channelManagement.noResults') || 'No channels found'}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('channelManagement.noResultsDesc') || 'Try adjusting your search or filters'}</p>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingChannel ? t('channelManagement.editChannel') : t('channelManagement.createChannel')}
        maxWidth="max-w-3xl"
      >
        <div className="flex gap-1 mb-4 sm:mb-6 bg-gray-100 dark:bg-dark-900/50 p-1 rounded-lg">
            <button
                className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'general'
                    ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('general')}
            >
                <FaSlidersH className="inline-block mr-1 sm:mr-2" />
                <span className="hidden xs:inline">{t('channelManagement.tabs.general')}</span>
                <span className="xs:hidden">General</span>
            </button>
            <button
                className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'permissions'
                    ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('permissions')}
            >
                <FaShieldAlt className="inline-block mr-1 sm:mr-2" />
                <span className="hidden xs:inline">{t('channelManagement.tabs.permissions')}</span>
                <span className="xs:hidden">Perms</span>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('channelManagement.channelName')}>
                        <div className="relative">
                            <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={`${inputClasses} pl-10`}
                            placeholder={t('channelManagement.placeholders.name')}
                            required
                            maxLength={100}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                                {formData.type === 4 ? <FaFolder /> : (formData.type === 2 ? <FaVolumeUp/> : <FaHashtag/>)}
                            </div>
                        </div>
                    </FormField>
                    
                    <FormField label={t('channelManagement.channelType')}>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: parseInt(e.target.value) })}
                        className={inputClasses}
                        disabled={!!editingChannel} 
                    >
                        <option value={0}>{t('channelManagement.typeText')}</option>
                        <option value={2}>{t('channelManagement.typeVoice')}</option>
                        <option value={4}>{t('channelManagement.typeCategory')}</option>
                        <option value={5}>{t('channelManagement.typeAnnouncement')}</option>
                        <option value={15}>{t('channelManagement.typeForum')}</option>
                        <option value={13}>{t('channelManagement.typeStage')}</option>
                    </select>
                    </FormField>
                </div>

                {formData.type !== 4 && (
                    <FormField label={t('channelManagement.parentCategory')}>
                        <select
                        value={formData.parentId}
                        onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                        className={inputClasses}
                        >
                        <option value="">{t('channelManagement.noCategory')}</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        </select>
                    </FormField>
                )}

                {(formData.type === 0 || formData.type === 5) && (
                    <>
                        <FormField label={t('channelManagement.channelTopic')}>
                        <textarea
                            value={formData.topic}
                            onChange={e => setFormData({ ...formData, topic: e.target.value })}
                            className={`${inputClasses} min-h-[80px]`}
                            placeholder={t('channelManagement.placeholders.topic')}
                            maxLength={1024}
                        />
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                             <FormField label={t('channelManagement.slowmode')}>
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-dark-900 p-3 rounded-lg border border-gray-200 dark:border-dark-700">
                                    <input 
                                        type="range" 
                                        min="0" max="21600" step="5"
                                        value={formData.rateLimitPerUser}
                                        onChange={e => setFormData({...formData, rateLimitPerUser: parseInt(e.target.value)})}
                                        className="w-full accent-primary-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-700"
                                    />
                                    <span className="text-sm font-mono w-16 text-right text-gray-700 dark:text-gray-300">
                                        {formData.rateLimitPerUser}s
                                    </span>
                                </div>
                             </FormField>
                             
                             <div className="pt-7">
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.nsfw}
                                        onChange={e => setFormData({ ...formData, nsfw: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white dark:bg-dark-800 dark:border-dark-600"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {t('channelManagement.nsfw')}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('channelManagement.nsfwDesc')}
                                        </span>
                                    </div>
                                </label>
                             </div>
                        </div>
                    </>
                )}

                {(formData.type === 2 || formData.type === 13) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('channelManagement.bitrate')}>
                             <select
                                value={formData.bitrate}
                                onChange={e => setFormData({ ...formData, bitrate: parseInt(e.target.value) })}
                                className={inputClasses}
                            >
                                <option value={64000}>{t('channelManagement.bitrateOptions.default')}</option>
                                <option value={96000}>{t('channelManagement.bitrateOptions.good')}</option>
                                <option value={128000}>{t('channelManagement.bitrateOptions.high')}</option>
                                <option value={256000}>{t('channelManagement.bitrateOptions.vip')}</option>
                            </select>
                        </FormField>
                         <FormField label={t('channelManagement.userLimit')}>
                            <input
                                type="number"
                                min="0" max="99"
                                value={formData.userLimit}
                                onChange={e => setFormData({...formData, userLimit: parseInt(e.target.value)})}
                                className={inputClasses}
                                placeholder={t('channelManagement.placeholders.userLimit')}
                            />
                        </FormField>
                    </div>
                )}
            </div>
          )}

          {activeTab === 'permissions' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in min-h-[300px]">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 sm:p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30 mb-3 sm:mb-4">
                      <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 flex gap-2">
                          <FaExclamationTriangle className="flex-shrink-0 mt-0.5 w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{t('channelManagement.permissionsWarning')}</span>
                      </p>
                  </div>

                  {roles.map(role => {
                       const state = formData.permissionOverwrites.find(o => o.id === role.id);
                       if (role.name !== '@everyone' && !state) return null;

                       return (
                           <div key={role.id} className="border border-gray-200 dark:border-dark-700 rounded-lg overflow-hidden bg-white dark:bg-dark-800">
                               <div className="bg-gray-50 dark:bg-dark-900/50 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-gray-100 dark:border-dark-700">
                                   <div className="flex items-center gap-2 min-w-0">
                                       <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: role.color ? `#${role.color.toString(16)}` : '#99aab5' }}></div>
                                       <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">{role.name}</span>
                                   </div>
                                   {role.name !== '@everyone' && (
                                       <button
                                            type="button"
                                            onClick={() => {
                                                const newOverwrites = formData.permissionOverwrites.filter(o => o.id !== role.id);
                                                setFormData({ ...formData, permissionOverwrites: newOverwrites });
                                            }}
                                            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium flex-shrink-0 ml-2"
                                       >
                                           {t('common.remove')}
                                       </button>
                                   )}
                               </div>
                               <div className="p-3 sm:p-4 grid gap-2 sm:gap-3 max-h-80 overflow-y-auto">
                                   {getPermissionsForChannelType(formData.type).map(perm => {
                                       const permState = getPermissionState(role.id, perm.value);
                                       return (
                                           <div key={perm.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 group p-2 sm:p-0 bg-gray-50 sm:bg-transparent dark:bg-dark-900/50 sm:dark:bg-transparent rounded-lg sm:rounded-none">
                                               <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                                   {perm.label}
                                               </span>
                                               <div className="flex bg-gray-100 dark:bg-dark-900 rounded-lg p-1 transition-colors self-end sm:self-auto flex-shrink-0">
                                                   <button
                                                        type="button"
                                                        onClick={() => handlePermissionChange(role.id, perm.value, 'deny')}
                                                        className={`p-1.5 sm:p-1.5 rounded-md transition-all ${permState === 'deny' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                                   >
                                                       <FaTimes className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                   </button>
                                                   <button
                                                        type="button"
                                                        onClick={() => handlePermissionChange(role.id, perm.value, 'inherit')}
                                                        className={`p-1.5 sm:p-1.5 rounded-md transition-all ${permState === 'inherit' ? 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-300 shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                                   >
                                                       <FaSlash className="w-2.5 h-2.5 sm:w-3 sm:h-3 transform -rotate-45" />
                                                   </button>
                                                   <button
                                                        type="button"
                                                        onClick={() => handlePermissionChange(role.id, perm.value, 'allow')}
                                                        className={`p-1.5 sm:p-1.5 rounded-md transition-all ${permState === 'allow' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                                   >
                                                       <FaCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                   </button>
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       );
                  })}
                  
                  <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('channelManagement.addRoleOverride')}</label>
                      <div className="relative" ref={roleDropdownRef}>
                          <button
                              type="button"
                              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                              className={`${inputClasses} flex items-center justify-between cursor-pointer`}
                          >
                              <span className="text-gray-500 dark:text-gray-400">{t('channelManagement.selectRolePlaceholder')}</span>
                              <FaChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {roleDropdownOpen && (
                              <div className="absolute z-[100] w-full bottom-full mb-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg shadow-xl">
                                  <div className="max-h-60 overflow-y-auto">
                                      {roles
                                          .filter(r => r.name !== '@everyone' && !formData.permissionOverwrites.find(o => o.id === r.id))
                                          .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                                          .map(role => {
                                              const roleColor = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5';
                                              return (
                                                  <button
                                                      key={role.id}
                                                      type="button"
                                                      onClick={() => {
                                                          handlePermissionChange(role.id, 0n, 'inherit', true);
                                                          setRoleDropdownOpen(false);
                                                          setRoleSearch('');
                                                      }}
                                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left"
                                                  >
                                                      <div
                                                          className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                                          style={{ backgroundColor: roleColor }}
                                                      />
                                                      <span
                                                          className="text-sm font-medium truncate"
                                                          style={{ color: roleColor }}
                                                      >
                                                          {role.name}
                                                      </span>
                                                  </button>
                                              );
                                          })}
                                      {roles
                                          .filter(r => r.name !== '@everyone' && !formData.permissionOverwrites.find(o => o.id === r.id))
                                          .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                                          .length === 0 && (
                                          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                              {t('channelManagement.noRolesFound') || 'No roles found'}
                                          </div>
                                      )}
                                  </div>
                                  <div className="p-2 border-t border-gray-100 dark:border-dark-700">
                                      <div className="relative">
                                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                          <input
                                              type="text"
                                              value={roleSearch}
                                              onChange={(e) => setRoleSearch(e.target.value)}
                                              placeholder={t('channelManagement.searchRoles') || 'Search roles...'}
                                              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-md focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                              autoFocus
                                          />
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {deleteConfirm && (
        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={t('common.confirm')}>
          <div className="space-y-4">
             <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-100 dark:border-red-900/30">
                <FaExclamationTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                    <h4 className="font-bold">{t('channelManagement.deleteWarningTitle')}</h4>
                    <p className="text-sm">{t('channelManagement.deleteWarningText')}</p>
                </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
                {t('channelManagement.confirmDelete')} <span className="font-bold text-gray-900 dark:text-white">#{deleteConfirm.name}</span>?
                {deleteConfirm.type === 4 && (
                    <span className="block mt-2 text-sm text-red-500 font-medium">
                        {t('channelManagement.confirmDeleteCategory')}
                    </span>
                )}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={showWebhooksModal} onClose={() => setShowWebhooksModal(false)} title={t('channelManagement.webhooks.title')}>
          <div className="space-y-4">
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    className={inputClasses} 
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    placeholder={t('channelManagement.webhooks.namePlaceholder')}
                  />
                  <button onClick={createWebhook} className="btn-primary">{t('channelManagement.webhooks.create')}</button>
              </div>
              <div className="space-y-2">
                  {webhooks.map(w => (
                      <div key={w.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-dark-900 rounded">
                          <span>{w.name}</span>
                          <div className="flex gap-2">
                              <button onClick={() => { navigator.clipboard.writeText(w.url); setMessage({type: 'success', text: t('channelManagement.webhooks.copied')})}} className="text-gray-500 hover:text-white"><FaCopy/></button>
                              <button onClick={() => deleteWebhook(w.id)} className="text-red-500"><FaTrash/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </Modal>

      <Modal isOpen={showPinsModal} onClose={() => setShowPinsModal(false)} title={t('channelManagement.pins.title')}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
              {pins.map(p => (
                  <div key={p.id} className="p-3 bg-gray-50 dark:bg-dark-900 rounded border border-gray-200 dark:border-dark-700">
                      <p className="text-sm mb-2">{p.content}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                          <span>{p.author.username}</span>
                          <button onClick={() => unpinMessage(p.id)} className="text-red-500 hover:underline">{t('channelManagement.pins.unpin')}</button>
                      </div>
                  </div>
              ))}
              {pins.length === 0 && <p className="text-center text-gray-500">{t('channelManagement.pins.empty')}</p>}
          </div>
      </Modal>

      {/* Backups Modal */}
      <Modal isOpen={showBackupsModal} onClose={() => setShowBackupsModal(false)} title={t('channelManagement.backups.title') || 'Server Backups'} maxWidth="max-w-2xl">
          <div className="space-y-4">
              {/* Create Backup Section */}
              <div className="bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800">
                  <h3 className="font-bold text-primary-800 dark:text-primary-300 mb-3 flex items-center gap-2">
                      <FaCloudDownloadAlt className="w-4 h-4" />
                      {t('channelManagement.backups.createNew') || 'Create New Backup'}
                  </h3>
                  <div className="flex gap-2">
                      <input
                          type="text"
                          className={inputClasses}
                          value={newBackupName}
                          onChange={(e) => setNewBackupName(e.target.value)}
                          placeholder={t('channelManagement.backups.namePlaceholder') || 'Backup name (optional)'}
                      />
                      <button onClick={handleCreateBackup} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                          <FaDownload className="w-3 h-3" />
                          {t('channelManagement.backups.create') || 'Create'}
                      </button>
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                      {t('channelManagement.backups.createDesc') || 'Saves all channels and roles to the server.'}
                  </p>
              </div>

              {/* Backup List */}
              <div>
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <FaHistory className="w-4 h-4" />
                      {t('channelManagement.backups.saved') || 'Saved Backups'}
                  </h3>

                  {loadingBackups ? (
                      <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                  ) : backups.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <FaDatabase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>{t('channelManagement.backups.empty') || 'No backups yet'}</p>
                      </div>
                  ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                          {backups.map(backup => (
                              <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                                  <div className="min-w-0 flex-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{backup.name}</h4>
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          <span>{new Date(backup.timestamp).toLocaleString()}</span>
                                          <span className="flex items-center gap-1">
                                              <FaHashtag className="w-3 h-3" />
                                              {backup.channelCount} {t('channelManagement.backups.channels') || 'channels'}
                                          </span>
                                          <span className="flex items-center gap-1">
                                              <FaShieldAlt className="w-3 h-3" />
                                              {backup.roleCount} {t('channelManagement.backups.roles') || 'roles'}
                                          </span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                      <button
                                          onClick={() => handleRestoreBackup(backup.id)}
                                          disabled={restoringBackup === backup.id}
                                          className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1.5"
                                          title={t('channelManagement.backups.restore') || 'Restore'}
                                      >
                                          {restoringBackup === backup.id ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : (
                                              <FaUpload className="w-3 h-3" />
                                          )}
                                          <span className="hidden sm:inline">{t('channelManagement.backups.restore') || 'Restore'}</span>
                                      </button>
                                      <button
                                          onClick={() => handleDeleteBackup(backup.id)}
                                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title={t('common.delete')}
                                      >
                                          <FaTrash className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-dark-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('channelManagement.backups.note') || 'Note: Restoring a backup creates new channels and roles. Existing ones are not deleted.'}
                  </p>
              </div>
          </div>
      </Modal>
    </div>
  );
};

const FaFolderPlus = (props) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M624 208H432c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h192c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm-400 48c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path>
    </svg>
);

const CategoryItem = ({ category, onEdit, onDelete, onCreateChannel, channelCount, isCollapsed, onToggleCollapse, selected, toggleSelection, t }) => (
  <div className="group flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 shadow-sm mb-2">
    <div className="flex items-center gap-3 overflow-hidden flex-1">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => toggleSelection(category.id)}
        className="rounded border-gray-300 text-primary-600"
      />
      <button onClick={onToggleCollapse} className="p-1 text-gray-400 hover:bg-gray-200 rounded">
        <FaChevronRight className={`transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
      </button>
      <div className="flex items-center gap-2">
        <FaFolderOpen className="text-orange-500" />
        <span className="font-bold text-sm dark:text-gray-200">{category.name}</span>
        <span className="text-[10px] bg-gray-200 dark:bg-dark-700 px-2 py-0.5 rounded-full">
          {channelCount}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button onClick={onCreateChannel} className="p-2 text-green-500 hover:bg-green-50 rounded"><FaPlus /></button>
      <button onClick={() => onEdit(category)} className="p-2 text-primary-500 hover:bg-primary-50 rounded"><FaCog /></button>
      <button onClick={() => onDelete(category)} className="p-2 text-red-500 hover:bg-red-50 rounded"><FaTrash /></button>
    </div>
  </div>
);

const ChannelItem = ({ channel, onEdit, onDelete, onClone, onSync, onArchive, onWebhooks, onPins, selected, toggleSelection, isNested, t }) => {
  const getChannelIcon = (type) => {
    switch (type) {
      case 2: return FaVolumeUp;
      case 5: return FaBullhorn;
      case 13: return FaBroadcastTower;
      case 15: return FaListAlt;
      default: return FaHashtag;
    }
  };
  const Icon = getChannelIcon(channel.type);
  const isTextChannel = channel.type === 0 || channel.type === 5;

  return (
    <div className={`group flex items-center justify-between p-2 rounded-lg border transition-all mb-1 ${
      selected ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' : 'bg-white dark:bg-dark-800 border-transparent hover:border-gray-200 dark:hover:border-dark-600'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <input type="checkbox" checked={selected} onChange={() => toggleSelection(channel.id)} className="rounded border-gray-300 dark:border-dark-600" />
        <Icon className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className="truncate text-sm text-gray-700 dark:text-gray-300">{channel.name}</span>
        {channel.nsfw && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">NSFW</span>}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onClone(channel)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title={t('channelManagement.clone') || 'Clone'}><FaCopy size={14}/></button>
        {channel.parentId && <button onClick={() => onSync(channel)} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title={t('channelManagement.syncPerms') || 'Sync Permissions'}><FaSync size={14}/></button>}
        {isTextChannel && <button onClick={() => onArchive(channel)} className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded" title={t('channelManagement.archive') || 'Archive'}><FaArchive size={14}/></button>}
        {isTextChannel && <button onClick={() => onWebhooks(channel)} className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded" title={t('channelManagement.webhooks.title') || 'Webhooks'}><FaLock size={14}/></button>}
        {isTextChannel && <button onClick={() => onPins(channel)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title={t('channelManagement.pins.title') || 'Pins'}><FaThumbtack size={14}/></button>}
        <button onClick={() => onEdit(channel)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded" title={t('common.edit') || 'Edit'}><FaEdit size={14}/></button>
        <button onClick={() => onDelete(channel)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title={t('common.delete') || 'Delete'}><FaTrash size={14}/></button>
      </div>
    </div>
  );
};

export default ChannelManagementTab;