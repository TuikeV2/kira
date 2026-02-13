import React, { useState, useEffect } from 'react';
import { FaGift, FaTrash, FaClock, FaTrophy, FaPlus, FaTimes, FaPause, FaPlay, FaRedo, FaStopCircle, FaCog, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { giveawayService } from '../../../services/api.service';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function GiveawayTab({ guildId, channels, roles }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [showCreator, setShowCreator] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [formData, setFormData] = useState({
    prize: '',
    description: '',
    duration: '',
    winners: 1,
    channelId: '',
    // Requirements
    requiredRoles: [],
    requiredRolesType: 'any',
    blacklistedRoles: [],
    minAccountAge: '',
    minServerTime: '',
    minLevel: '',
    minMessages: '',
    // Bonus entries
    bonusEntries: [],
    // Customization
    embedColor: '#9333ea',
    embedImage: '',
    embedThumbnail: '',
    // Winner settings
    dmWinners: true,
    winnerMessage: '',
    // Drop giveaway
    isDropGiveaway: false
  });

  useEffect(() => {
    fetchGiveaways();
  }, [guildId, filter]);

  const fetchGiveaways = async () => {
    try {
      setLoading(true);
      const response = await giveawayService.getGiveaways(guildId, { status: filter === 'all' ? undefined : filter });
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setGiveaways(data);
    } catch (error) {
      toast.error('Failed to load giveaways');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (giveawayId) => {
    if (!window.confirm('Are you sure you want to cancel this giveaway?')) return;

    try {
      setActionLoading(giveawayId);
      await giveawayService.deleteGiveaway(guildId, giveawayId);
      toast.success('Giveaway cancelled successfully!');
      fetchGiveaways();
    } catch (error) {
      toast.error('Failed to cancel giveaway');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnd = async (giveawayId) => {
    if (!window.confirm('Are you sure you want to end this giveaway now?')) return;

    try {
      setActionLoading(giveawayId);
      await giveawayService.endGiveaway(guildId, giveawayId);
      toast.success('Giveaway ended successfully!');
      fetchGiveaways();
    } catch (error) {
      toast.error('Failed to end giveaway');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReroll = async (giveawayId) => {
    const winnersCount = window.prompt('How many new winners to pick?', '1');
    if (!winnersCount) return;

    try {
      setActionLoading(giveawayId);
      await giveawayService.rerollGiveaway(guildId, giveawayId, parseInt(winnersCount));
      toast.success('Giveaway rerolled successfully!');
      fetchGiveaways();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reroll giveaway');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (giveawayId) => {
    try {
      setActionLoading(giveawayId);
      await giveawayService.pauseGiveaway(guildId, giveawayId);
      toast.success('Giveaway paused!');
      fetchGiveaways();
    } catch (error) {
      toast.error('Failed to pause giveaway');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (giveawayId) => {
    try {
      setActionLoading(giveawayId);
      await giveawayService.resumeGiveaway(guildId, giveawayId);
      toast.success('Giveaway resumed!');
      fetchGiveaways();
    } catch (error) {
      toast.error('Failed to resume giveaway');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    try {
      // Validation
      if (!formData.prize || !formData.duration || !formData.winners || !formData.channelId) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate duration format
      const durationRegex = /^(\d+)([smhd])$/;
      if (!durationRegex.test(formData.duration)) {
        toast.error('Invalid duration format! Use: 30s, 5m, 2h, or 1d');
        return;
      }

      setCreating(true);

      const payload = {
        prize: formData.prize,
        description: formData.description || null,
        duration: formData.duration,
        winners: parseInt(formData.winners),
        channelId: formData.channelId,
        // Requirements
        requiredRoles: formData.requiredRoles.length > 0 ? formData.requiredRoles : null,
        requiredRolesType: formData.requiredRolesType,
        blacklistedRoles: formData.blacklistedRoles.length > 0 ? formData.blacklistedRoles : null,
        minAccountAge: formData.minAccountAge ? parseInt(formData.minAccountAge) : null,
        minServerTime: formData.minServerTime ? parseInt(formData.minServerTime) : null,
        minLevel: formData.minLevel ? parseInt(formData.minLevel) : null,
        minMessages: formData.minMessages ? parseInt(formData.minMessages) : null,
        // Bonus entries
        bonusEntries: formData.bonusEntries.length > 0 ? formData.bonusEntries : null,
        // Customization
        embedColor: formData.embedColor,
        embedImage: formData.embedImage || null,
        embedThumbnail: formData.embedThumbnail || null,
        // Winner settings
        dmWinners: formData.dmWinners,
        winnerMessage: formData.winnerMessage || null,
        // Drop giveaway
        isDropGiveaway: formData.isDropGiveaway
      };

      await giveawayService.createGiveaway(guildId, payload);

      toast.success('Giveaway created successfully!');

      // Reset form
      setFormData({
        prize: '',
        description: '',
        duration: '',
        winners: 1,
        channelId: '',
        requiredRoles: [],
        requiredRolesType: 'any',
        blacklistedRoles: [],
        minAccountAge: '',
        minServerTime: '',
        minLevel: '',
        minMessages: '',
        bonusEntries: [],
        embedColor: '#9333ea',
        embedImage: '',
        embedThumbnail: '',
        dmWinners: true,
        winnerMessage: '',
        isDropGiveaway: false
      });

      setShowCreator(false);
      setShowAdvanced(false);
      setFilter('active');
      fetchGiveaways();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to create giveaway';
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleToggle = (field, roleId) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(roleId)
        ? prev[field].filter(id => id !== roleId)
        : [...prev[field], roleId]
    }));
  };

  const addBonusEntry = () => {
    setFormData(prev => ({
      ...prev,
      bonusEntries: [...prev.bonusEntries, { roleId: '', entries: 1 }]
    }));
  };

  const updateBonusEntry = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      bonusEntries: prev.bonusEntries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const removeBonusEntry = (index) => {
    setFormData(prev => ({
      ...prev,
      bonusEntries: prev.bonusEntries.filter((_, i) => i !== index)
    }));
  };

  const getTimeRemaining = (endsAt) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 dark:text-gray-400">Loading giveaways...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaGift className="text-purple-500" />
              Giveaways
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Create and manage giveaways from the dashboard or use <span className="font-mono bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded">/giveaway</span> in Discord
            </p>
          </div>

          {/* Filter & Create Button */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreator(!showCreator)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              {showCreator ? <FaTimes /> : <FaPlus />}
              {showCreator ? 'Cancel' : 'Create Giveaway'}
            </button>
            {['active', 'paused', 'ended', 'all'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Creator Form */}
      {showCreator && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FaGift className="text-purple-500" />
            Create New Giveaway
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prize */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prize <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.prize}
                onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                placeholder="e.g., Discord Nitro"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                maxLength={255}
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.channelId}
                onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a channel</option>
                {channels?.filter(c => c.type === 0).map(channel => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 1h, 2d, 30m"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: number + unit (s=seconds, m=minutes, h=hours, d=days)</p>
            </div>

            {/* Winners */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Winners <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.winners}
                onChange={(e) => setFormData({ ...formData, winners: e.target.value })}
                min="1"
                max="20"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter a description for the giveaway..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                maxLength={500}
              />
            </div>

            {/* Drop Giveaway Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDropGiveaway}
                  onChange={(e) => setFormData({ ...formData, isDropGiveaway: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 dark:border-dark-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drop Giveaway - First {formData.winners || 1} to click win immediately
                </span>
              </label>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium hover:underline"
          >
            <FaCog />
            Advanced Options
            {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600 space-y-6">
              {/* Requirements Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Entry Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Roles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Required Roles
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-dark-600 rounded-lg">
                      {roles?.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleRoleToggle('requiredRoles', role.id)}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            formData.requiredRoles.includes(role.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-500'
                          }`}
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                    {formData.requiredRoles.length > 0 && (
                      <div className="mt-2">
                        <select
                          value={formData.requiredRolesType}
                          onChange={(e) => setFormData({ ...formData, requiredRolesType: e.target.value })}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        >
                          <option value="any">Any of these roles</option>
                          <option value="all">All of these roles</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Blacklisted Roles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Blacklisted Roles
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-dark-600 rounded-lg">
                      {roles?.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleRoleToggle('blacklistedRoles', role.id)}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            formData.blacklistedRoles.includes(role.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-500'
                          }`}
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min Account Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Account Age (days)
                    </label>
                    <input
                      type="number"
                      value={formData.minAccountAge}
                      onChange={(e) => setFormData({ ...formData, minAccountAge: e.target.value })}
                      placeholder="e.g., 30"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Min Server Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Time on Server (days)
                    </label>
                    <input
                      type="number"
                      value={formData.minServerTime}
                      onChange={(e) => setFormData({ ...formData, minServerTime: e.target.value })}
                      placeholder="e.g., 7"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Min Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Level
                    </label>
                    <input
                      type="number"
                      value={formData.minLevel}
                      onChange={(e) => setFormData({ ...formData, minLevel: e.target.value })}
                      placeholder="e.g., 5"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Min Messages */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Messages
                    </label>
                    <input
                      type="number"
                      value={formData.minMessages}
                      onChange={(e) => setFormData({ ...formData, minMessages: e.target.value })}
                      placeholder="e.g., 100"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bonus Entries Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Bonus Entries</h4>
                  <button
                    type="button"
                    onClick={addBonusEntry}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1"
                  >
                    <FaPlus className="text-xs" /> Add
                  </button>
                </div>
                {formData.bonusEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No bonus entries configured</p>
                ) : (
                  <div className="space-y-2">
                    {formData.bonusEntries.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          value={entry.roleId}
                          onChange={(e) => updateBonusEntry(index, 'roleId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select role</option>
                          {roles?.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={entry.entries}
                          onChange={(e) => updateBonusEntry(index, 'entries', parseInt(e.target.value) || 1)}
                          min="1"
                          max="10"
                          className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                          placeholder="Entries"
                        />
                        <button
                          type="button"
                          onClick={() => removeBonusEntry(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customization Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Embed Customization</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Embed Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Embed Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.embedColor}
                        onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.embedColor}
                        onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        placeholder="#9333ea"
                      />
                    </div>
                  </div>

                  {/* Embed Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.embedImage}
                      onChange={(e) => setFormData({ ...formData, embedImage: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Embed Thumbnail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thumbnail URL
                    </label>
                    <input
                      type="url"
                      value={formData.embedThumbnail}
                      onChange={(e) => setFormData({ ...formData, embedThumbnail: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Winner Settings Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Winner Settings</h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dmWinners}
                      onChange={(e) => setFormData({ ...formData, dmWinners: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 dark:border-dark-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Send DM to winners
                    </span>
                  </label>

                  {formData.dmWinners && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Winner Message (Optional)
                      </label>
                      <textarea
                        value={formData.winnerMessage}
                        onChange={(e) => setFormData({ ...formData, winnerMessage: e.target.value })}
                        placeholder="Congratulations! You won {prize} in the giveaway on {server}!"
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Placeholders: {'{prize}'}, {'{server}'}, {'{user}'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Button */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowCreator(false); setShowAdvanced(false); }}
              className="px-6 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-700 transition-all"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaGift />
                  Create Giveaway
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Giveaways List */}
      <div className="card p-6">
        {giveaways.length === 0 ? (
          <div className="text-center py-12">
            <FaGift className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No {filter === 'all' ? '' : filter} giveaways</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {filter === 'active'
                ? 'Start a giveaway using /giveaway command in your Discord server'
                : filter === 'paused'
                ? 'No paused giveaways'
                : 'No ended giveaways yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {giveaways.map((giveaway) => (
              <div
                key={giveaway.id}
                className="border border-gray-200 dark:border-dark-600 rounded-lg p-5 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaGift className="text-purple-500" />
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg">{giveaway.prize}</h3>
                      {giveaway.isDropGiveaway && (
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded font-medium">
                          DROP
                        </span>
                      )}
                    </div>
                    {giveaway.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{giveaway.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FaTrophy className="text-yellow-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {giveaway.winners} {giveaway.winners === 1 ? 'Winner' : 'Winners'}
                    </span>
                  </div>

                  {giveaway.status === 'active' ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FaClock className="text-blue-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Ends in: <span className="font-semibold">{getTimeRemaining(giveaway.endsAt)}</span>
                      </span>
                    </div>
                  ) : giveaway.status === 'paused' ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FaPause className="text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                        Paused
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <FaClock className="text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">
                        Ended on {new Date(giveaway.endsAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Participants:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {giveaway.participants?.length || 0}
                    </span>
                  </div>

                  {giveaway.winnersList && giveaway.winnersList.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-600">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Winners:</p>
                      <div className="flex flex-wrap gap-1">
                        {giveaway.winnersList.map((winner, idx) => (
                          <span
                            key={idx}
                            className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-1 rounded font-medium"
                          >
                            {winner}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status & Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-600 flex items-center justify-between">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        giveaway.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : giveaway.status === 'paused'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : giveaway.status === 'ended'
                          ? 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {giveaway.status.toUpperCase()}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {giveaway.status === 'active' && (
                        <>
                          <button
                            onClick={() => handlePause(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors disabled:opacity-50"
                            title="Pause"
                          >
                            <FaPause className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleEnd(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                            title="End Now"
                          >
                            <FaStopCircle className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </>
                      )}

                      {giveaway.status === 'paused' && (
                        <>
                          <button
                            onClick={() => handleResume(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                            title="Resume"
                          >
                            <FaPlay className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleEnd(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                            title="End Now"
                          >
                            <FaStopCircle className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(giveaway.id)}
                            disabled={actionLoading === giveaway.id}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </>
                      )}

                      {giveaway.status === 'ended' && (
                        <button
                          onClick={() => handleReroll(giveaway.id)}
                          disabled={actionLoading === giveaway.id}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors disabled:opacity-50"
                          title="Reroll"
                        >
                          <FaRedo className="text-sm" />
                        </button>
                      )}

                      {actionLoading === giveaway.id && (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
