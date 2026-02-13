const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const { checkLicense } = require('../../middleware/licenseCheck');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages from the channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!await checkLicense(interaction)) return;

    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: Math.min(amount, 100) });

      if (targetUser) {
        messages = messages.filter(msg => msg.author.id === targetUser.id);
      }

      const deletedMessages = await interaction.channel.bulkDelete(messages, true);

      await models.ModerationLog.create({
        guildId: interaction.guildId,
        actionType: 'CLEAR',
        moderatorId: interaction.user.id,
        targetId: targetUser?.id || null,
        reason: `Cleared ${deletedMessages.size} messages`,
        metadata: { amount: deletedMessages.size, channelId: interaction.channelId }
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'clear',
        success: true
      });

      await interaction.editReply({
        embeds: [createSuccessEmbed(
          'Messages Cleared',
          `Successfully deleted ${deletedMessages.size} message(s)${targetUser ? ` from ${targetUser.tag}` : ''}`
        )]
      });

      logger.info(`${deletedMessages.size} messages cleared in ${interaction.guild.name} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Clear command error:', error);
      await interaction.editReply({
        embeds: [createErrorEmbed('Error', 'Failed to clear messages. Messages older than 14 days cannot be bulk deleted.')]
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'clear',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
