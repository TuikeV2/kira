const { SlashCommandBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot statistics'),

  async execute(interaction) {
    try {
      const totalGuilds = await models.Guild.count({ where: { isActive: true } });
      const totalUsers = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      const totalCommands = await models.CommandUsage.count();
      const uptime = process.uptime();

      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      const embed = createInfoEmbed('Bot Statistics', '');
      embed.addFields(
        { name: 'Servers', value: totalGuilds.toString(), inline: true },
        { name: 'Users', value: totalUsers.toString(), inline: true },
        { name: 'Commands Used', value: totalCommands.toString(), inline: true },
        { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
        { name: 'Ping', value: `${interaction.client.ws.ping}ms`, inline: true }
      );

      await interaction.reply({ embeds: [embed] });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'stats',
        success: true
      });
    } catch (error) {
      logger.error('Stats command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed('Error', 'Failed to fetch statistics')],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'stats',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
