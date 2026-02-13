const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/logs', authenticateToken, moderationController.getModerationLogs);
router.get('/warnings/:guildId', authenticateToken, moderationController.getWarnings);
router.get('/mutes/:guildId', authenticateToken, moderationController.getMutes);
router.get('/invites/:guildId', authenticateToken, moderationController.getInviteLogs);
router.get('/invites/:guildId/stats', authenticateToken, moderationController.getInviteStats);

module.exports = router;
