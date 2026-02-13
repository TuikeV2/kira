const { models } = require('@kira/shared');
const logger = require('./logger');

/**
 * Apply bot customization settings for a specific guild
 * @param {Guild} guild - Discord.js Guild object
 * @param {Object} settings - Guild settings object (optional, will fetch from DB if not provided)
 */
async function applyBotCustomization(guild, settings = null) {
  try {
    // Fetch settings from database if not provided
    if (!settings) {
      const guildData = await models.Guild.findOne({
        where: { guildId: guild.id, isActive: true }
      });
      settings = guildData?.settings || {};
    }

    const botMember = guild.members.me;
    if (!botMember) {
      logger.warn(`Bot member not found in guild ${guild.name} (${guild.id})`);
      return false;
    }

    // Apply nickname if set and different from current
    const targetNickname = settings.botNickname || null;
    const currentNickname = botMember.nickname;

    if (targetNickname !== currentNickname) {
      try {
        await botMember.setNickname(targetNickname);
        logger.info(`Set bot nickname to "${targetNickname || 'default'}" in ${guild.name}`);
      } catch (nickError) {
        // Missing permissions to change nickname
        if (nickError.code === 50013) {
          logger.warn(`Missing permissions to change nickname in ${guild.name}`);
        } else {
          logger.error(`Failed to set nickname in ${guild.name}:`, nickError.message);
        }
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error applying bot customization for guild ${guild.id}:`, error);
    return false;
  }
}

/**
 * Apply bot customization to all guilds
 * @param {Client} client - Discord.js Client
 */
async function applyCustomizationToAllGuilds(client) {
  logger.info('Applying bot customization to all guilds...');

  const guilds = await models.Guild.findAll({
    where: { isActive: true }
  });

  for (const guildData of guilds) {
    const guild = client.guilds.cache.get(guildData.guildId);
    if (!guild) continue;

    await applyBotCustomization(guild, guildData.settings);
  }

  logger.info('Bot customization applied to all guilds');
}

/**
 * Apply global bot avatar (affects all servers)
 * @param {Client} client - Discord.js Client
 * @param {string} avatarUrl - URL or base64 data of the new avatar
 */
async function applyGlobalBotAvatar(client, avatarUrl) {
  if (!avatarUrl) return false;

  try {
    await client.user.setAvatar(avatarUrl);
    logger.info('Global bot avatar updated successfully');
    return true;
  } catch (error) {
    if (error.code === 50035) {
      logger.error('Invalid avatar format or size');
    } else {
      logger.error('Failed to update bot avatar:', error.message);
    }
    return false;
  }
}

module.exports = {
  applyBotCustomization,
  applyCustomizationToAllGuilds,
  applyGlobalBotAvatar
};
