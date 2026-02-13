const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const { checkLicense } = require('../../middleware/licenseCheck');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user in the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the unmute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!await checkLicense(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [createErrorEmbed('Error', 'User not found in this server')],
        ephemeral: true
      });
    }

    if (!member.communicationDisabledUntil) {
      return interaction.reply({
        embeds: [createErrorEmbed('Error', 'User is not muted')],
        ephemeral: true
      });
    }

    try {
      await member.timeout(null, reason);

      await models.Mute.update(
        { isActive: false, unmutedAt: new Date() },
        { where: { guildId: interaction.guildId, userId: targetUser.id, isActive: true } }
      );

      await models.ModerationLog.create({
        guildId: interaction.guildId,
        actionType: 'UNMUTE',
        moderatorId: interaction.user.id,
        targetId: targetUser.id,
        reason: reason
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'unmute',
        success: true
      });

      await interaction.reply({
        embeds: [createSuccessEmbed(
          'User Unmuted',
          `${targetUser.tag} has been unmuted\n**Reason:** ${reason}`
        )]
      });

      logger.info(`User ${targetUser.tag} unmuted in ${interaction.guild.name} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Unmute command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed('Error', 'Failed to unmute user')],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'unmute',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
