const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');

// Stripe webhook - requires raw body (handled in main index.js)
router.post('/stripe', purchaseController.handleWebhook);

module.exports = router;
