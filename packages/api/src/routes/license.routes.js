const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, requireAdmin, licenseController.getAllLicenses);
router.post('/', authenticateToken, requireAdmin, licenseController.createLicense);
router.get('/:id', authenticateToken, licenseController.getLicenseById);
router.put('/:id', authenticateToken, requireAdmin, licenseController.updateLicense);
router.delete('/:id', authenticateToken, requireAdmin, licenseController.deleteLicense);
router.post('/verify', licenseController.verifyLicense);
router.post('/activate', authenticateToken, licenseController.activateLicense);
router.post('/extend', authenticateToken, licenseController.extendLicense);
router.post('/stack', authenticateToken, licenseController.stackLicense);

module.exports = router;
