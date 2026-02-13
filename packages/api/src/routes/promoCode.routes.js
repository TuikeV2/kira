const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCode.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// All routes require admin access
router.get('/', authenticateToken, requireAdmin, promoCodeController.getAllPromoCodes);
router.post('/', authenticateToken, requireAdmin, promoCodeController.createPromoCode);
router.get('/:id', authenticateToken, requireAdmin, promoCodeController.getPromoCodeById);
router.put('/:id', authenticateToken, requireAdmin, promoCodeController.updatePromoCode);
router.delete('/:id', authenticateToken, requireAdmin, promoCodeController.deletePromoCode);

module.exports = router;
