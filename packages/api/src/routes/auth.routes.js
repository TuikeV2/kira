const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/discord', authController.initiateDiscordOAuth);
router.get('/discord/callback', authController.handleDiscordCallback);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
