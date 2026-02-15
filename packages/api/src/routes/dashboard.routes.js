const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public endpoints (no auth)
router.get('/public-stats', dashboardController.getPublicStats);
router.get('/public-features', dashboardController.getPublicFeatures);

router.get('/stats', authenticateToken, dashboardController.getStats);
router.get('/servers', authenticateToken, dashboardController.getServers);
router.get('/commands', authenticateToken, dashboardController.getCommandStats);
router.get('/activity', authenticateToken, dashboardController.getActivity);
router.get('/user-guilds', authenticateToken, dashboardController.getUserGuilds);
router.get('/servers/:guildId', authenticateToken, dashboardController.getGuildDetails);
router.put('/servers/:guildId', authenticateToken, dashboardController.updateGuildSettings);

router.get('/servers/:guildId/channels', authenticateToken, dashboardController.getGuildChannels);
router.post('/servers/:guildId/channels', authenticateToken, dashboardController.createChannel);
router.patch('/servers/:guildId/channels/reorder', authenticateToken, dashboardController.reorderChannels);
router.post('/servers/:guildId/channels/bulk-delete', authenticateToken, dashboardController.bulkDeleteChannels);
router.patch('/servers/:guildId/channels/:channelId', authenticateToken, dashboardController.updateChannel);
router.delete('/servers/:guildId/channels/:channelId', authenticateToken, dashboardController.deleteChannel);
router.post('/servers/:guildId/channels/:channelId/clone', authenticateToken, dashboardController.cloneChannel);
router.post('/servers/:guildId/channels/:channelId/sync', authenticateToken, dashboardController.syncChannelPermissions);
router.post('/servers/:guildId/channels/:channelId/archive', authenticateToken, dashboardController.archiveChannel);

router.get('/servers/:guildId/channels/:channelId/webhooks', authenticateToken, dashboardController.getChannelWebhooks);
router.post('/servers/:guildId/channels/:channelId/webhooks', authenticateToken, dashboardController.createWebhook);
router.delete('/servers/:guildId/channels/:channelId/webhooks/:webhookId', authenticateToken, dashboardController.deleteWebhook);

router.get('/servers/:guildId/channels/:channelId/pins', authenticateToken, dashboardController.getPinnedMessages);
router.delete('/servers/:guildId/channels/:channelId/pins/:messageId', authenticateToken, dashboardController.unpinMessage);

router.post('/servers/:guildId/backup', authenticateToken, dashboardController.createBackup);
router.get('/servers/:guildId/backups', authenticateToken, dashboardController.listBackups);
router.get('/servers/:guildId/backups/:backupId', authenticateToken, dashboardController.getBackup);
router.delete('/servers/:guildId/backups/:backupId', authenticateToken, dashboardController.deleteBackup);
router.post('/servers/:guildId/backup/restore', authenticateToken, dashboardController.restoreBackup);

router.get('/servers/:guildId/roles', authenticateToken, dashboardController.getGuildRoles);
router.post('/servers/:guildId/roles', authenticateToken, dashboardController.createRole);
router.patch('/servers/:guildId/roles/reorder', authenticateToken, dashboardController.reorderRoles);
router.post('/servers/:guildId/roles/bulk-delete', authenticateToken, dashboardController.bulkDeleteRoles);
router.patch('/servers/:guildId/roles/:roleId', authenticateToken, dashboardController.updateRole);
router.delete('/servers/:guildId/roles/:roleId', authenticateToken, dashboardController.deleteRole);
router.post('/servers/:guildId/roles/:roleId/clone', authenticateToken, dashboardController.cloneRole);

router.get('/servers/:guildId/emojis', authenticateToken, dashboardController.getGuildEmojis);
router.get('/servers/:guildId/channels/:channelId/messages/:messageId', authenticateToken, dashboardController.fetchChannelMessage);
router.post('/servers/:guildId/embed', authenticateToken, dashboardController.sendEmbedMessage);
router.post('/servers/:guildId/reaction-roles', authenticateToken, dashboardController.createReactionRolePanel);
router.delete('/servers/:guildId/reaction-roles/:panelId', authenticateToken, dashboardController.deleteReactionRolePanel);

router.post('/servers/:guildId/stats-channels', authenticateToken, dashboardController.createStatsChannels);
router.delete('/servers/:guildId/stats-channels', authenticateToken, dashboardController.deleteStatsChannels);

// Custom stats channels - własne kanały statystyk z dowolnymi zmiennymi
router.get('/servers/:guildId/custom-stats', authenticateToken, dashboardController.getCustomStatsChannels);
router.post('/servers/:guildId/custom-stats', authenticateToken, dashboardController.createCustomStatsChannel);
router.put('/servers/:guildId/custom-stats/:channelId', authenticateToken, dashboardController.updateCustomStatsChannel);
router.delete('/servers/:guildId/custom-stats/:channelId', authenticateToken, dashboardController.deleteCustomStatsChannel);

module.exports = router;