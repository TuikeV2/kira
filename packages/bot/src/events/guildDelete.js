const { Events } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild, client) {
    logger.info(`Left guild: ${guild.name} (${guild.id})`);

    try {
      await models.Guild.update(
        { isActive: false, leftAt: new Date() },
        { where: { guildId: guild.id } }
      );

      logger.info(`Marked guild ${guild.name} as inactive in database`);
    } catch (error) {
      logger.error(`Error handling guild delete for ${guild.name}:`, error);
    }
  }
};
