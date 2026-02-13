const express = require('express');
const router = express.Router();
const musicController = require('../controllers/music.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/:guildId/status', authenticateToken, musicController.getStatus);
router.get('/:guildId/queue', authenticateToken, musicController.getQueue);
router.post('/:guildId/play', authenticateToken, musicController.play);
router.post('/:guildId/pause', authenticateToken, musicController.pause);
router.post('/:guildId/skip', authenticateToken, musicController.skip);
router.post('/:guildId/stop', authenticateToken, musicController.stop);
router.post('/:guildId/volume', authenticateToken, musicController.setVolume);
router.post('/:guildId/remove', authenticateToken, musicController.removeTrack);

module.exports = router;
