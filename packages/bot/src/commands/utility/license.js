const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { models, constants } = require('@kira/shared');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('View license information for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guild = await models.Guild.findOne({
        where: { guildId: interaction.guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guild || !guild.license) {
        return interaction.reply({
          embeds: [createErrorEmbed('No License', 'This server does not have a license')],
          ephemeral: true
        });
      }

      const license = guild.license;
      const tierConfig = constants.getTierConfig(license.tier);
      const activeGuilds = await models.Guild.count({
        where: { licenseId: license.id, isActive: true }
      });

      const embed = createInfoEmbed('Server License Information', null);
      embed.addFields(
        { name: 'Tier', value: tierConfig.name, inline: true },
        { name: 'License Key', value: `||${license.licenseKey}||`, inline: true },
        { name: 'Status', value: license.isValid() ? 'Active' : 'Expired', inline: true },
        { name: 'Server Usage', value: `${activeGuilds}/${license.maxServers === -1 ? 'Unlimited' : license.maxServers}`, inline: true },
        { name: 'Expires', value: license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never', inline: true },
        { name: 'Features', value: tierConfig.features === 'all' ? 'All Features' : tierConfig.features.join(', '), inline: false }
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'license',
        success: true
      });
    } catch (error) {
      logger.error('License command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed('Error', 'Failed to fetch license information')],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'license',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
