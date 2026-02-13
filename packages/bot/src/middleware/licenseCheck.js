const { models, constants } = require('@kira/shared');
const { createErrorEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');

async function respond(interaction, options) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(options);
  }
  return interaction.reply(options);
}

async function checkLicense(interaction) {
  try {
    const guild = await models.Guild.findOne({
      where: { guildId: interaction.guildId, isActive: true },
      include: [{ model: models.License, as: 'license' }]
    });

    if (!guild || !guild.license) {
      await respond(interaction, {
        embeds: [createErrorEmbed(
          '🔒 Brak Licencji',
          'Ten serwer nie posiada aktywnej licencji.\n\n' +
          'Wszystkie funkcje bota są zablokowane do czasu aktywacji licencji.\n' +
          'Zakup licencję na: https://kiraevo.pl/buy'
        )],
        ephemeral: true
      });
      return false;
    }

    if (!guild.license.isValid()) {
      await respond(interaction, {
        embeds: [createErrorEmbed(
          '⚠️ Licencja Wygasła',
          'Licencja tego serwera wygasła.\n\n' +
          'Wszystkie funkcje bota są zablokowane do czasu odnowienia licencji.\n' +
          'Odnów licencję na: https://kiraevo.pl/buy'
        )],
        ephemeral: true
      });
      return false;
    }

    const canUse = constants.canUseCommand(guild.license.tier, interaction.commandName);
    if (!canUse) {
      const tierName = constants.getTierConfig(guild.license.tier).name;
      await respond(interaction, {
        embeds: [createErrorEmbed(
          '💎 Funkcja Premium',
          `Ta komenda nie jest dostępna w Twojej licencji **${tierName}**.\n\n` +
          'Ulepsz licencję aby odblokować wszystkie funkcje: https://kiraevo.pl/buy'
        )],
        ephemeral: true
      });
      return false;
    }

    interaction.license = guild.license;
    interaction.guildData = guild;

    return true;
  } catch (error) {
    logger.error('License check error:', error);
    await respond(interaction, {
      embeds: [createErrorEmbed(
        '❌ Błąd',
        'Wystąpił błąd podczas sprawdzania licencji. Spróbuj ponownie później.'
      )],
      ephemeral: true
    });
    return false;
  }
}

module.exports = { checkLicense };
