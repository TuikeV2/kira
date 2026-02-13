const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const { checkLicense } = require('../../middleware/licenseCheck');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user in the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g., 1h, 30m, 1d)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!await checkLicense(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration') || '1h';
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [createErrorEmbed('Error', 'User not found in this server')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [createErrorEmbed('Error', 'You cannot mute this user')],
        ephemeral: true
      });
    }

    try {
      const durationMs = ms(duration);
      if (!durationMs || durationMs > ms('28d')) {
        return interaction.reply({
          embeds: [createErrorEmbed('Error', 'Invalid duration (max 28 days)')],
          ephemeral: true
        });
      }

      await member.timeout(durationMs, reason);

      await models.Mute.create({
        guildId: interaction.guildId,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason,
        expiresAt: new Date(Date.now() + durationMs)
      });

      await models.ModerationLog.create({
        guildId: interaction.guildId,
        actionType: 'MUTE',
        moderatorId: interaction.user.id,
        targetId: targetUser.id,
        reason: reason,
        metadata: { duration: duration }
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'mute',
        success: true
      });

      await interaction.reply({
        embeds: [createSuccessEmbed(
          'User Muted',
          `${targetUser.tag} has been muted for ${duration}\n**Reason:** ${reason}`
        )]
      });

      logger.info(`User ${targetUser.tag} muted in ${interaction.guild.name} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Mute command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed('Error', 'Failed to mute user')],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'mute',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
