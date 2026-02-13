const { models, utils, constants } = require('@kira/shared');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

async function getAllLicenses(req, res) {
  try {
    const { page = 1, limit = 20, tier, active } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (tier) where.tier = tier;
    if (active !== undefined) where.isActive = active === 'true';

    const { rows: licenses, count } = await models.License.findAndCountAll({
      where,
      include: [
        { model: models.Guild, as: 'guilds', where: { isActive: true }, required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, licenses, page, limit, count);
  } catch (error) {
    logger.error('Get all licenses error:', error);
    return ApiResponse.error(res, 'Failed to fetch licenses', null, 500);
  }
}

async function createLicense(req, res) {
  try {
    const { tier = 'FREE', maxServers, expiresAt } = req.body;

    if (!['FREE', 'PREMIUM', 'VIP'].includes(tier)) {
      return ApiResponse.error(res, 'Invalid tier. Must be FREE, PREMIUM, or VIP');
    }

    // Ustalanie limitu serwerów (jeśli podano maxServers w body, użyj go, w przeciwnym razie domyślne dla tieru)
    const tierConfig = constants.getTierConfig(tier);
    const actualMaxServers = maxServers !== undefined ? parseInt(maxServers) : tierConfig.maxServers;

    const licenseKey = utils.generateLicenseKey(tier);

    const license = await models.License.create({
      licenseKey,
      tier,
      maxServers: actualMaxServers,
      createdByUserId: req.user.userId, 
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true
    });

    logger.info(`License created: ${licenseKey} by user ${req.user.discordId} (ID: ${req.user.userId}) with limit: ${actualMaxServers}`);

    return ApiResponse.success(res, license, 'License created successfully', 201);
  } catch (error) {
    logger.error('Create license error:', error);
    return ApiResponse.error(res, 'Failed to create license', null, 500);
  }
}

async function getLicenseById(req, res) {
  try {
    const { id } = req.params;

    const license = await models.License.findByPk(id, {
      include: [
        { model: models.Guild, as: 'guilds', where: { isActive: true }, required: false }
      ]
    });

    if (!license) {
      return ApiResponse.error(res, 'License not found', null, 404);
    }

    return ApiResponse.success(res, license);
  } catch (error) {
    logger.error('Get license by ID error:', error);
    return ApiResponse.error(res, 'Failed to fetch license', null, 500);
  }
}

async function updateLicense(req, res) {
  try {
    const { id } = req.params;
    const { tier, maxServers, expiresAt, isActive } = req.body;

    const license = await models.License.findByPk(id);

    if (!license) {
      return ApiResponse.error(res, 'License not found', null, 404);
    }

    const updates = {};
    if (tier) updates.tier = tier;
    if (maxServers !== undefined) updates.maxServers = maxServers;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updates.isActive = isActive;

    await license.update(updates);

    logger.info(`License updated: ${license.licenseKey} by user ${req.user.discordId}`);

    return ApiResponse.success(res, license, 'License updated successfully');
  } catch (error) {
    logger.error('Update license error:', error);
    return ApiResponse.error(res, 'Failed to update license', null, 500);
  }
}

async function deleteLicense(req, res) {
  try {
    const { id } = req.params;

    const license = await models.License.findByPk(id);

    if (!license) {
      return ApiResponse.error(res, 'License not found', null, 404);
    }

    // ZMIANA: Twarde usuwanie (destroy) zamiast tylko deaktywacji, aby zniknęła z listy
    // Najpierw odłączamy gildie
    await models.Guild.update(
      { isActive: false, leftAt: new Date(), licenseId: null },
      { where: { licenseId: id } }
    );

    await license.destroy();

    logger.info(`License deleted: ${license.licenseKey} by user ${req.user.discordId}`);

    return ApiResponse.success(res, null, 'License deleted successfully');
  } catch (error) {
    logger.error('Delete license error:', error);
    return ApiResponse.error(res, 'Failed to delete license', null, 500);
  }
}

async function verifyLicense(req, res) {
  try {
    const { licenseKey, guildId } = req.body;

    if (!licenseKey) {
      return ApiResponse.error(res, 'License key is required');
    }

    const license = await models.License.findOne({
      where: { licenseKey },
      include: [
        { model: models.Guild, as: 'guilds', where: { isActive: true }, required: false }
      ]
    });

    if (!license) {
      return ApiResponse.success(res, {
        valid: false,
        message: 'License not found'
      });
    }

    const isValid = license.isValid();
    const canAdd = guildId ? await license.canAddServer() : true;

    await license.update({ lastVerifiedAt: new Date() });

    return ApiResponse.success(res, {
      valid: isValid && canAdd,
      tier: license.tier,
      expiresAt: license.expiresAt,
      maxServers: license.maxServers,
      currentServers: license.guilds.length,
      message: !isValid ? 'License expired or inactive' : (!canAdd ? 'Server limit reached' : 'Valid')
    });
  } catch (error) {
    logger.error('Verify license error:', error);
    return ApiResponse.error(res, 'Failed to verify license', null, 500);
  }
}

async function activateLicense(req, res) {
  try {
    const { licenseKey, guildId, guildName } = req.body;

    if (!licenseKey || !guildId) {
      return ApiResponse.error(res, 'License key and guild ID are required');
    }

    const license = await models.License.findOne({
      where: { licenseKey },
      include: [
        { model: models.Guild, as: 'guilds', where: { isActive: true }, required: false }
      ]
    });

    if (!license) {
      return ApiResponse.error(res, 'License not found', null, 404);
    }

    if (!license.isValid()) {
      return ApiResponse.error(res, 'License is expired or inactive');
    }

    const canAddServer = await license.canAddServer();
    if (!canAddServer) {
      return ApiResponse.error(res, 'Server limit reached for this license');
    }

    let guild = await models.Guild.findOne({ where: { guildId } });

    if (guild) {
      if (guild.licenseId && guild.isActive) {
        // Auto-stack: extend existing license instead of blocking
        const existingLicense = await models.License.findByPk(guild.licenseId);

        if (existingLicense && existingLicense.isValid()) {
          const now = new Date();

          // Calculate new license duration from its creation to expiry
          if (!license.expiresAt) {
            return ApiResponse.error(res, 'New license has no expiration date to stack');
          }
          const newLicenseDuration = license.expiresAt.getTime() - license.created_at.getTime();

          // Stack: add new duration on top of existing remaining time
          const baseDate = (existingLicense.expiresAt && existingLicense.expiresAt > now)
            ? existingLicense.expiresAt
            : now;
          const newExpiresAt = new Date(baseDate.getTime() + newLicenseDuration);

          // Upgrade tier if new license has higher tier
          const tierOrder = ['FREE', 'PREMIUM', 'VIP'];
          let upgradedTier = existingLicense.tier;
          if (tierOrder.indexOf(license.tier) > tierOrder.indexOf(existingLicense.tier)) {
            upgradedTier = license.tier;
          }

          // Take higher maxServers
          let newMaxServers = existingLicense.maxServers;
          if (license.maxServers === -1 || existingLicense.maxServers === -1) {
            newMaxServers = -1;
          } else if (license.maxServers > existingLicense.maxServers) {
            newMaxServers = license.maxServers;
          }

          // Update existing license with stacked time
          const metadata = existingLicense.metadata || {};
          metadata.reminderSent = false;
          metadata.lastStacked = now.toISOString();
          metadata.stackHistory = metadata.stackHistory || [];
          metadata.stackHistory.push({
            date: now.toISOString(),
            stackedLicenseKey: licenseKey,
            durationAdded: Math.ceil(newLicenseDuration / (24 * 60 * 60 * 1000)),
            previousExpiry: existingLicense.expiresAt ? existingLicense.expiresAt.toISOString() : null,
            newExpiry: newExpiresAt.toISOString()
          });

          await existingLicense.update({
            expiresAt: newExpiresAt,
            tier: upgradedTier,
            maxServers: newMaxServers,
            isActive: true,
            metadata
          });

          // Mark the new license as consumed
          await license.update({
            isActive: false,
            metadata: {
              ...license.metadata,
              stackedInto: existingLicense.licenseKey,
              stackedAt: now.toISOString()
            }
          });

          logger.info(`License ${licenseKey} auto-stacked into ${existingLicense.licenseKey} for guild ${guildId} by user ${req.user.discordId}. New expiry: ${newExpiresAt}`);

          return ApiResponse.success(res, {
            guild,
            license: {
              tier: upgradedTier,
              expiresAt: newExpiresAt,
              maxServers: newMaxServers
            },
            stacked: true,
            previousExpiresAt: existingLicense.expiresAt
          }, 'License stacked successfully - time has been added to your existing license');
        }
      }

      await guild.update({
        licenseId: license.id,
        guildName: guildName || guild.guildName,
        isActive: true,
        leftAt: null
      });
    } else {
      guild = await models.Guild.create({
        guildId,
        guildName,
        licenseId: license.id,
        ownerId: req.user.discordId,
        isActive: true
      });
    }

    await license.update({ lastVerifiedAt: new Date() });

    logger.info(`License ${licenseKey} activated for guild ${guildId} by user ${req.user.discordId}`);

    return ApiResponse.success(res, {
      guild,
      license: {
        tier: license.tier,
        expiresAt: license.expiresAt,
        maxServers: license.maxServers
      }
    }, 'License activated successfully');
  } catch (error) {
    logger.error('Activate license error:', error);
    return ApiResponse.error(res, 'Failed to activate license', null, 500);
  }
}

async function extendLicense(req, res) {
  try {
    const { licenseKey, additionalDays } = req.body;

    if (!licenseKey || !additionalDays) {
      return ApiResponse.error(res, 'License key and additional days are required');
    }

    const daysToAdd = parseInt(additionalDays);
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
      return ApiResponse.error(res, 'Additional days must be a positive number');
    }

    const license = await models.License.findOne({ where: { licenseKey } });

    if (!license) {
      return ApiResponse.error(res, 'License not found', null, 404);
    }

    const now = new Date();
    let baseDate = now;

    if (license.expiresAt && license.isActive && license.expiresAt > now) {
      baseDate = license.expiresAt;
    }

    const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const metadata = license.metadata || {};
    metadata.reminderSent = false;
    metadata.lastExtended = now.toISOString();
    metadata.extensionHistory = metadata.extensionHistory || [];
    metadata.extensionHistory.push({
      date: now.toISOString(),
      daysAdded: daysToAdd,
      previousExpiry: license.expiresAt ? license.expiresAt.toISOString() : null,
      newExpiry: newExpiresAt.toISOString()
    });

    await license.update({
      expiresAt: newExpiresAt,
      isActive: true,
      metadata
    });

    logger.info(`License ${licenseKey} extended by ${daysToAdd} days. New expiry: ${newExpiresAt}`);

    return ApiResponse.success(res, {
      licenseKey: license.licenseKey,
      tier: license.tier,
      previousExpiresAt: license.expiresAt,
      newExpiresAt,
      daysAdded: daysToAdd
    }, 'License extended successfully');
  } catch (error) {
    logger.error('Extend license error:', error);
    return ApiResponse.error(res, 'Failed to extend license', null, 500);
  }
}

async function stackLicense(req, res) {
  try {
    const { existingLicenseKey, newLicenseKey } = req.body;

    if (!existingLicenseKey || !newLicenseKey) {
      return ApiResponse.error(res, 'Both existing and new license keys are required');
    }

    const existingLicense = await models.License.findOne({
      where: { licenseKey: existingLicenseKey },
      include: [{ model: models.Guild, as: 'guilds', where: { isActive: true }, required: false }]
    });

    if (!existingLicense) {
      return ApiResponse.error(res, 'Existing license not found', null, 404);
    }

    const newLicense = await models.License.findOne({ where: { licenseKey: newLicenseKey } });

    if (!newLicense) {
      return ApiResponse.error(res, 'New license not found', null, 404);
    }

    if (!newLicense.isActive) {
      return ApiResponse.error(res, 'New license is not active');
    }

    if (newLicense.guilds && newLicense.guilds.length > 0) {
      return ApiResponse.error(res, 'New license is already in use');
    }

    if (!newLicense.expiresAt) {
      return ApiResponse.error(res, 'New license has no expiration date to stack');
    }

    const now = new Date();
    let baseDate = now;

    if (existingLicense.expiresAt && existingLicense.isActive && existingLicense.expiresAt > now) {
      baseDate = existingLicense.expiresAt;
    }

    const newLicenseDuration = newLicense.expiresAt.getTime() - newLicense.created_at.getTime();
    const newExpiresAt = new Date(baseDate.getTime() + newLicenseDuration);

    const metadata = existingLicense.metadata || {};
    metadata.reminderSent = false;
    metadata.lastStacked = now.toISOString();
    metadata.stackHistory = metadata.stackHistory || [];
    metadata.stackHistory.push({
      date: now.toISOString(),
      stackedLicenseKey: newLicenseKey,
      durationAdded: Math.ceil(newLicenseDuration / (24 * 60 * 60 * 1000)),
      previousExpiry: existingLicense.expiresAt ? existingLicense.expiresAt.toISOString() : null,
      newExpiry: newExpiresAt.toISOString()
    });

    let upgradedTier = existingLicense.tier;
    const tierOrder = ['FREE', 'PREMIUM', 'VIP'];
    if (tierOrder.indexOf(newLicense.tier) > tierOrder.indexOf(existingLicense.tier)) {
      upgradedTier = newLicense.tier;
    }

    let newMaxServers = existingLicense.maxServers;
    if (newLicense.maxServers === -1 || existingLicense.maxServers === -1) {
      newMaxServers = -1;
    } else if (newLicense.maxServers > existingLicense.maxServers) {
      newMaxServers = newLicense.maxServers;
    }

    await existingLicense.update({
      expiresAt: newExpiresAt,
      tier: upgradedTier,
      maxServers: newMaxServers,
      isActive: true,
      metadata
    });

    await newLicense.update({
      isActive: false,
      metadata: {
        ...newLicense.metadata,
        stackedInto: existingLicenseKey,
        stackedAt: now.toISOString()
      }
    });

    logger.info(`License ${newLicenseKey} stacked into ${existingLicenseKey}. New expiry: ${newExpiresAt}`);

    return ApiResponse.success(res, {
      licenseKey: existingLicense.licenseKey,
      tier: upgradedTier,
      previousExpiresAt: existingLicense.expiresAt,
      newExpiresAt,
      maxServers: newMaxServers,
      stackedLicense: newLicenseKey
    }, 'License stacked successfully');
  } catch (error) {
    logger.error('Stack license error:', error);
    return ApiResponse.error(res, 'Failed to stack license', null, 500);
  }
}

module.exports = {
  getAllLicenses,
  createLicense,
  getLicenseById,
  updateLicense,
  deleteLicense,
  verifyLicense,
  activateLicense,
  extendLicense,
  stackLicense
};