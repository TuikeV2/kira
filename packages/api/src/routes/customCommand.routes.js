const express = require('express');
const router = express.Router();
const customCommandController = require('../controllers/customCommand.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/:guildId', authenticateToken, customCommandController.getCustomCommands);
router.post('/:guildId', authenticateToken, customCommandController.createCustomCommand);
router.put('/:guildId/:commandId', authenticateToken, customCommandController.updateCustomCommand);
router.delete('/:guildId/:commandId', authenticateToken, customCommandController.deleteCustomCommand);

module.exports = router;
