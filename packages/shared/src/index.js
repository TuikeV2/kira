const { sequelize, ...models } = require('./database/models');
const { generateLicenseKey, validateLicenseKeyFormat } = require('./utils/licenseGenerator');
const { LICENSE_TIERS, canUseCommand, getTierConfig } = require('./constants/licenseTypes');
const { DISCORD_PERMISSIONS, USER_ROLES } = require('./constants/permissions');
const i18n = require('./i18n');

module.exports = {
  sequelize,
  models,
  utils: {
    generateLicenseKey,
    validateLicenseKeyFormat
  },
  constants: {
    LICENSE_TIERS,
    canUseCommand,
    getTierConfig,
    DISCORD_PERMISSIONS,
    USER_ROLES
  },
  i18n
};
