const { Events, ActivityType } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');
const { initializeInviteCache } = require('../utils/inviteCache');
const { applyCustomizationToAllGuilds } = require('../utils/botCustomization');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    client.user.setPresence({
      activities: [{ name: ' ❱❱❱ https://KiraEvo.pl/ ❰❰❰', type: ActivityType.Listening }],
      status: 'online'
    });

    try {
      await validateAllGuilds(client);
    } catch (error) {
      logger.error('Error validating guilds on startup:', error);
    }

    // Apply bot customization (nicknames) for all guilds
    try {
      await applyCustomizationToAllGuilds(client);
    } catch (error) {
      logger.error('Error applying bot customization:', error);
    }

    // Initialize invite cache for invite tracking
    try {
      await initializeInviteCache(client);
    } catch (error) {
      logger.error('Error initializing invite cache:', error);
    }
  }
};

async function validateAllGuilds(client) {
  logger.info('Validating all guild licenses...');

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const guildData = await models.Guild.findOne({
        where: { guildId: guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guildData || !guildData.license) {
        logger.warn(`Guild ${guild.name} (${guildId}) has no active license - commands blocked until license is activated`);
        // Ensure guild record exists in DB so license can be activated later
        await models.Guild.findOrCreate({
          where: { guildId },
          defaults: { guildName: guild.name, ownerId: guild.ownerId, isActive: false }
        });
        continue;
      }

      if (!guildData.license.isValid()) {
        logger.warn(`Guild ${guild.name} (${guildId}) has expired license - commands blocked until license is renewed`);
        await models.Guild.update(
          { isActive: false },
          { where: { guildId: guildId } }
        );
        continue;
      }

      await models.Guild.update(
        { guildName: guild.name, ownerId: guild.ownerId },
        { where: { guildId: guildId } }
      );

      logger.info(`Guild ${guild.name} (${guildId}) validated successfully`);
    } catch (error) {
      logger.error(`Error validating guild ${guildId}:`, error);
    }
  }

  logger.info('Guild validation complete');
}
