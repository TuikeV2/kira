import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  initiateOAuth: () => {
    window.location.href = `${API_URL}/api/auth/discord`;
  },
  getCurrentUser: () => api.get('/api/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    return api.post('/api/auth/logout');
  }
};

export const licenseService = {
  getAll: (params) => api.get('/api/licenses', { params }),
  create: (data) => api.post('/api/licenses', data),
  getById: (id) => api.get(`/api/licenses/${id}`),
  update: (id, data) => api.put(`/api/licenses/${id}`, data),
  delete: (id) => api.delete(`/api/licenses/${id}`),
  verify: (data) => api.post('/api/licenses/verify', data),
  activate: (data) => api.post('/api/licenses/activate', data),
  stack: (data) => api.post('/api/licenses/stack', data),
  extend: (data) => api.post('/api/licenses/extend', data)
};

export const dashboardService = {
  getStats: () => api.get('/api/dashboard/stats'),
  getServers: (params) => api.get('/api/dashboard/servers', { params }),
  getCommandStats: (params) => api.get('/api/dashboard/commands', { params }),
  getActivity: (params) => api.get('/api/dashboard/activity', { params }),
  getUserGuilds: () => api.get('/api/dashboard/user-guilds'),
  getGuildDetails: (guildId) => api.get(`/api/dashboard/servers/${guildId}`),
  getGuildChannels: (guildId) => api.get(`/api/dashboard/servers/${guildId}/channels`),
  createChannel: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/channels`, data),
  updateChannel: (guildId, channelId, data) => api.patch(`/api/dashboard/servers/${guildId}/channels/${channelId}`, data),
  deleteChannel: (guildId, channelId) => api.delete(`/api/dashboard/servers/${guildId}/channels/${channelId}`),
  reorderChannels: (guildId, items) => api.patch(`/api/dashboard/servers/${guildId}/channels/reorder`, { items }),
  bulkDeleteChannels: (guildId, channelIds) => api.post(`/api/dashboard/servers/${guildId}/channels/bulk-delete`, { channelIds }),
  cloneChannel: (guildId, channelId) => api.post(`/api/dashboard/servers/${guildId}/channels/${channelId}/clone`),
  syncChannelPermissions: (guildId, channelId) => api.post(`/api/dashboard/servers/${guildId}/channels/${channelId}/sync`),
  archiveChannel: (guildId, channelId) => api.post(`/api/dashboard/servers/${guildId}/channels/${channelId}/archive`),
  getChannelWebhooks: (guildId, channelId) => api.get(`/api/dashboard/servers/${guildId}/channels/${channelId}/webhooks`),
  createWebhook: (guildId, channelId, name) => api.post(`/api/dashboard/servers/${guildId}/channels/${channelId}/webhooks`, { name }),
  deleteWebhook: (guildId, channelId, webhookId) => api.delete(`/api/dashboard/servers/${guildId}/channels/${channelId}/webhooks/${webhookId}`),
  getPinnedMessages: (guildId, channelId) => api.get(`/api/dashboard/servers/${guildId}/channels/${channelId}/pins`),
  unpinMessage: (guildId, channelId, messageId) => api.delete(`/api/dashboard/servers/${guildId}/channels/${channelId}/pins/${messageId}`),
  createBackup: (guildId, name) => api.post(`/api/dashboard/servers/${guildId}/backup`, { name }),
  listBackups: (guildId) => api.get(`/api/dashboard/servers/${guildId}/backups`),
  getBackup: (guildId, backupId) => api.get(`/api/dashboard/servers/${guildId}/backups/${backupId}`),
  deleteBackup: (guildId, backupId) => api.delete(`/api/dashboard/servers/${guildId}/backups/${backupId}`),
  restoreBackup: (guildId, backupId) => api.post(`/api/dashboard/servers/${guildId}/backup/restore`, { backupId }),
  getGuildRoles: (guildId) => api.get(`/api/dashboard/servers/${guildId}/roles`),
  createRole: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/roles`, data),
  updateRole: (guildId, roleId, data) => api.patch(`/api/dashboard/servers/${guildId}/roles/${roleId}`, data),
  deleteRole: (guildId, roleId) => api.delete(`/api/dashboard/servers/${guildId}/roles/${roleId}`),
  cloneRole: (guildId, roleId) => api.post(`/api/dashboard/servers/${guildId}/roles/${roleId}/clone`),
  bulkDeleteRoles: (guildId, roleIds) => api.post(`/api/dashboard/servers/${guildId}/roles/bulk-delete`, { roleIds }),
  reorderRoles: (guildId, positions) => api.patch(`/api/dashboard/servers/${guildId}/roles/reorder`, { positions }),
  getGuildEmojis: (guildId) => api.get(`/api/dashboard/servers/${guildId}/emojis`),
  updateGuildSettings: (guildId, settings) => api.put(`/api/dashboard/servers/${guildId}`, { settings }),
  fetchMessage: (guildId, channelId, messageId) => api.get(`/api/dashboard/servers/${guildId}/channels/${channelId}/messages/${messageId}`),
  sendEmbed: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/embed`, data),
  createReactionRole: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/reaction-roles`, data),
  deleteReactionRole: (guildId, panelId) => api.delete(`/api/dashboard/servers/${guildId}/reaction-roles/${panelId}`),
  createStatsChannels: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/stats-channels`, data),
  deleteStatsChannels: (guildId) => api.delete(`/api/dashboard/servers/${guildId}/stats-channels`),
  // Custom stats channels
  getCustomStatsChannels: (guildId) => api.get(`/api/dashboard/servers/${guildId}/custom-stats`),
  createCustomStatsChannel: (guildId, data) => api.post(`/api/dashboard/servers/${guildId}/custom-stats`, data),
  updateCustomStatsChannel: (guildId, channelId, data) => api.put(`/api/dashboard/servers/${guildId}/custom-stats/${channelId}`, data),
  deleteCustomStatsChannel: (guildId, channelId) => api.delete(`/api/dashboard/servers/${guildId}/custom-stats/${channelId}`)
};

export const moderationService = {
  getLogs: (params) => api.get('/api/moderation/logs', { params }),
  getWarnings: (guildId, params) => api.get(`/api/moderation/warnings/${guildId}`, { params }),
  getMutes: (guildId, params) => api.get(`/api/moderation/mutes/${guildId}`, { params }),
  getInviteLogs: (guildId, params) => api.get(`/api/moderation/invites/${guildId}`, { params }),
  getInviteStats: (guildId) => api.get(`/api/moderation/invites/${guildId}/stats`)
};

export const ticketService = {
  getConfig: (guildId) => api.get(`/api/ticket/${guildId}`),
  updateConfig: (guildId, data) => api.put(`/api/ticket/${guildId}`, data),
  getChannels: (guildId) => api.get(`/api/ticket/${guildId}/channels`),
  getRoles: (guildId) => api.get(`/api/ticket/${guildId}/roles`),
  sendPanel: (guildId, channelId, mode) => api.post(`/api/ticket/${guildId}/send-panel`, { channelId, mode }),
  addCategory: (guildId, data) => api.post(`/api/ticket/${guildId}/categories`, data),
  updateCategory: (guildId, categoryId, data) => api.put(`/api/ticket/${guildId}/categories/${categoryId}`, data),
  deleteCategory: (guildId, categoryId) => api.delete(`/api/ticket/${guildId}/categories/${categoryId}`),
  updateCategoryForm: (guildId, categoryId, data) => api.put(`/api/ticket/${guildId}/categories/${categoryId}/form`, data),
  addFormField: (guildId, categoryId, data) => api.post(`/api/ticket/${guildId}/categories/${categoryId}/form/fields`, data),
  deleteFormField: (guildId, categoryId, fieldId) => api.delete(`/api/ticket/${guildId}/categories/${categoryId}/form/fields/${fieldId}`)
};

export const customCommandService = {
  getCommands: (guildId) => api.get(`/api/custom-commands/${guildId}`),
  createCommand: (guildId, data) => api.post(`/api/custom-commands/${guildId}`, data),
  updateCommand: (guildId, commandId, data) => api.put(`/api/custom-commands/${guildId}/${commandId}`, data),
  deleteCommand: (guildId, commandId) => api.delete(`/api/custom-commands/${guildId}/${commandId}`)
};

export const giveawayService = {
  getGiveaways: (guildId, params) => api.get(`/api/giveaways/${guildId}`, { params }),
  getGiveaway: (guildId, giveawayId) => api.get(`/api/giveaways/${guildId}/${giveawayId}`),
  createGiveaway: (guildId, data) => api.post(`/api/giveaways/${guildId}`, data),
  deleteGiveaway: (guildId, giveawayId) => api.delete(`/api/giveaways/${guildId}/${giveawayId}`),
  endGiveaway: (guildId, giveawayId) => api.put(`/api/giveaways/${guildId}/${giveawayId}/end`),
  rerollGiveaway: (guildId, giveawayId, winners) => api.post(`/api/giveaways/${guildId}/${giveawayId}/reroll`, { winners }),
  pauseGiveaway: (guildId, giveawayId) => api.put(`/api/giveaways/${guildId}/${giveawayId}/pause`),
  resumeGiveaway: (guildId, giveawayId) => api.put(`/api/giveaways/${guildId}/${giveawayId}/resume`)
};

export const purchaseService = {
  getPlans: () => api.get('/api/purchase/plans'),
  validatePromoCode: (code) => api.post('/api/purchase/promo/validate', { code }),
  createCheckout: (data) => api.post('/api/purchase/checkout', data),
  verifyPayment: (sessionId) => api.get(`/api/purchase/verify/${sessionId}`),
  getPurchaseHistory: () => api.get('/api/purchase/history')
};

export const adminService = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUsers: (params) => api.get('/api/admin/users', { params }),
  getUserStats: () => api.get('/api/admin/users/stats'),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/api/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  banUsers: (userIds, reason) => api.post('/api/admin/users/ban', { userIds, reason }),
  unbanUsers: (userIds) => api.post('/api/admin/users/unban', { userIds }),
  getCommandAnalytics: (params) => api.get('/api/admin/stats/commands', { params }),
  getAutomodAnalytics: (params) => api.get('/api/admin/stats/automod', { params }),
  getModerationAnalytics: (params) => api.get('/api/admin/stats/moderation', { params }),
  getServers: () => api.get('/api/admin/servers'),
  getProducts: () => api.get('/api/admin/products'),
  createProduct: (data) => api.post('/api/admin/products', data),
  updateProduct: (id, data) => api.put(`/api/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/api/admin/products/${id}`)
};

export const musicService = {
  getStatus: (guildId) => api.get(`/api/music/${guildId}/status`),
  play: (guildId, data) => api.post(`/api/music/${guildId}/play`, data),
  pause: (guildId) => api.post(`/api/music/${guildId}/pause`),
  skip: (guildId) => api.post(`/api/music/${guildId}/skip`),
  stop: (guildId) => api.post(`/api/music/${guildId}/stop`),
  setVolume: (guildId, volume) => api.post(`/api/music/${guildId}/volume`, { volume }),
  getQueue: (guildId) => api.get(`/api/music/${guildId}/queue`),
  removeTrack: (guildId, index) => api.post(`/api/music/${guildId}/remove`, { index }),
};

export const promoCodeService = {
  getAll: (params) => api.get('/api/promo-codes', { params }),
  create: (data) => api.post('/api/promo-codes', data),
  update: (id, data) => api.put(`/api/promo-codes/${id}`, data),
  delete: (id) => api.delete(`/api/promo-codes/${id}`)
};

export default api;