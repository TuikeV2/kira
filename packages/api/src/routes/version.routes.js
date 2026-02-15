const express = require('express');
const router = express.Router();
const versionController = require('../controllers/version.controller');

router.get('/latest', versionController.getLatestVersion);

module.exports = router;
