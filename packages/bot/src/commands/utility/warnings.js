const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const { checkLicense } = require('../../middleware/licenseCheck');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check warnings for')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!await checkLicense(interaction)) return;

    const targetUser = interaction.options.getUser('user');

    try {
      const warnings = await models.Warning.findAll({
        where: { guildId: interaction.guildId, userId: targetUser.id, isActive: true },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      if (warnings.length === 0) {
        return interaction.reply({
          embeds: [createInfoEmbed('No Warnings', `${targetUser.tag} has no active warnings`)],
          ephemeral: true
        });
      }

      const embed = createInfoEmbed(
        `Warnings for ${targetUser.tag}`,
        `Total: ${warnings.length} active warning(s)`
      );

      warnings.forEach((warning, index) => {
        const date = new Date(warning.created_at).toLocaleString();
        embed.addFields({
          name: `Warning #${index + 1} - ${date}`,
          value: `**Reason:** ${warning.reason}\n**Moderator:** <@${warning.moderatorId}>`,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'warnings',
        success: true
      });
    } catch (error) {
      logger.error('Warnings command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed('Error', 'Failed to fetch warnings')],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'warnings',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
