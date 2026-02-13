const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const { checkLicense } = require('../../middleware/licenseCheck');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const { getInteractionTranslator } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .setDescriptionLocalizations({
      pl: 'Ostrzega uzytkownika',
      ru: 'Выдает предупреждение пользователю'
    })
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setDescriptionLocalizations({
          pl: 'Uzytkownik do ostrzezenia',
          ru: 'Пользователь для предупреждения'
        })
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setDescriptionLocalizations({
          pl: 'Powod ostrzezenia',
          ru: 'Причина предупреждения'
        })
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!await checkLicense(interaction)) return;

    // Get translator for this guild
    const t = await getInteractionTranslator(interaction);

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [createErrorEmbed(t('common.error'), t('bot.errors.invalidUser'))],
        ephemeral: true
      });
    }

    try {
      await models.Warning.create({
        guildId: interaction.guildId,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason
      });

      await models.ModerationLog.create({
        guildId: interaction.guildId,
        actionType: 'WARN',
        moderatorId: interaction.user.id,
        targetId: targetUser.id,
        reason: reason
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'warn',
        success: true
      });

      const warningCount = await models.Warning.count({
        where: { guildId: interaction.guildId, userId: targetUser.id, isActive: true }
      });

      await interaction.reply({
        embeds: [createSuccessEmbed(
          t('moderation.warn'),
          t('bot.commands.warn.success', { user: targetUser.tag }) +
          `\n**${t('moderation.reason')}:** ${reason}\n**${t('bot.commands.warnings.title', { user: '' }).replace('{user}', '')}:** ${warningCount}`
        )]
      });

      try {
        await targetUser.send({
          embeds: [createSuccessEmbed(
            `${t('moderation.warn')} - ${interaction.guild.name}`,
            t('bot.commands.warn.success', { user: targetUser.tag }) +
            `\n**${t('moderation.reason')}:** ${reason}\n**${t('bot.commands.warnings.title', { user: '' }).replace('{user}', '')}:** ${warningCount}`
          )]
        });
      } catch (dmError) {
        logger.warn(`Could not DM ${targetUser.tag}`);
      }

      logger.info(`User ${targetUser.tag} warned in ${interaction.guild.name} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Warn command error:', error);
      await interaction.reply({
        embeds: [createErrorEmbed(t('common.error'), t('bot.errors.commandError'))],
        ephemeral: true
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'warn',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
