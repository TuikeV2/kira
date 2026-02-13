const express = require('express');
const router = express.Router();
const giveawayController = require('../controllers/giveaway.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Get all giveaways for a guild
router.get('/:guildId', authenticateToken, giveawayController.getGiveaways);

// Get specific giveaway
router.get('/:guildId/:giveawayId', authenticateToken, giveawayController.getGiveaway);

// Create new giveaway
router.post('/:guildId', authenticateToken, giveawayController.createGiveaway);

// Delete/cancel giveaway
router.delete('/:guildId/:giveawayId', authenticateToken, giveawayController.deleteGiveaway);

// End giveaway early
router.put('/:guildId/:giveawayId/end', authenticateToken, giveawayController.endGiveaway);

// Reroll giveaway winners
router.post('/:guildId/:giveawayId/reroll', authenticateToken, giveawayController.rerollGiveaway);

// Pause giveaway
router.put('/:guildId/:giveawayId/pause', authenticateToken, giveawayController.pauseGiveaway);

// Resume giveaway
router.put('/:guildId/:giveawayId/resume', authenticateToken, giveawayController.resumeGiveaway);

module.exports = router;
