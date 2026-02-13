const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Basic config
router.get('/:guildId', authenticateToken, ticketController.getTicketConfig);
router.put('/:guildId', authenticateToken, ticketController.updateTicketConfig);
router.get('/:guildId/channels', authenticateToken, ticketController.getGuildChannels);
router.get('/:guildId/roles', authenticateToken, ticketController.getGuildRoles);
router.post('/:guildId/send-panel', authenticateToken, ticketController.sendTicketPanel);

// Category management
router.post('/:guildId/categories', authenticateToken, ticketController.addCategory);
router.put('/:guildId/categories/:categoryId', authenticateToken, ticketController.updateCategory);
router.delete('/:guildId/categories/:categoryId', authenticateToken, ticketController.deleteCategory);

// Form management
router.put('/:guildId/categories/:categoryId/form', authenticateToken, ticketController.updateCategoryForm);
router.post('/:guildId/categories/:categoryId/form/fields', authenticateToken, ticketController.addFormField);
router.delete('/:guildId/categories/:categoryId/form/fields/:fieldId', authenticateToken, ticketController.deleteFormField);

module.exports = router;