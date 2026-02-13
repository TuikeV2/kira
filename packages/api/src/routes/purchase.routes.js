const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.get('/plans', purchaseController.getPlans);

// Protected routes (require authentication)
router.post('/promo/validate', authenticateToken, purchaseController.validatePromoCode);
router.post('/checkout', authenticateToken, purchaseController.createCheckout);
router.get('/verify/:sessionId', authenticateToken, purchaseController.verifyPayment);
router.get('/history', authenticateToken, purchaseController.getPurchaseHistory);

module.exports = router;
