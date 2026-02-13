const { Events } = require('discord.js');
const { models, utils } = require('@kira/shared');
const logger = require('../utils/logger');
const config = require('../config/bot.config');
const { cacheGuildInvites } = require('../utils/inviteCache');
const { applyBotCustomization } = require('../utils/botCustomization');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

    try {
      // Sprawdź czy serwer ma już przypisaną licencję
      const existingGuild = await models.Guild.findOne({
        where: { guildId: guild.id },
        include: [{ model: models.License, as: 'license' }]
      });

      let license = existingGuild?.license || null;

      // Jeśli nie ma przypisanej licencji, sprawdź domyślną licencję z config
      if (!license && config.defaultLicenseKey) {
        license = await models.License.findOne({
          where: { licenseKey: config.defaultLicenseKey }
        });
      }

      // Jeśli nie ma licencji - utwórz rekord gildi ale bez licencji (funkcje będą zablokowane)
      if (!license) {
        logger.info(`Guild ${guild.name} has no license - bot will be inactive`);
        try {
          const owner = await guild.fetchOwner();
          await owner.send(
            `Dziękuję za dodanie mnie do **${guild.name}**!\n\n` +
            `⚠️ Twój serwer nie posiada aktywnej licencji.\n` +
            `Bot został dodany, ale **wszystkie funkcje są zablokowane** do czasu aktywacji licencji.\n\n` +
            `Aby odblokować bota KiraEvo, zakup licencję na naszej stronie: https://kiraevo.pl/buy\n` +
            `Po zakupie licencji, przypisz ją do serwera w panelu.`
          );
        } catch (dmError) {
          logger.warn(`Could not DM owner of ${guild.name}`);
        }

        // Utwórz rekord gildi bez licencji
        if (existingGuild) {
          await existingGuild.update({
            guildName: guild.name,
            licenseId: null,
            ownerId: guild.ownerId,
            isActive: true,
            leftAt: null,
            joinedAt: new Date()
          });
        } else {
          await models.Guild.create({
            guildId: guild.id,
            guildName: guild.name,
            licenseId: null,
            ownerId: guild.ownerId,
            isActive: true
          });
        }
        return;
      }

      if (!license.isValid()) {
        logger.warn(`License for guild ${guild.name} is invalid - bot will be inactive`);
        try {
          const owner = await guild.fetchOwner();
          await owner.send(
            `⚠️ Bot na serwerze **${guild.name}** został dezaktywowany - licencja wygasła.\n\n` +
            `**Wszystkie funkcje są zablokowane** do czasu odnowienia licencji.\n` +
            `Odnów licencję na stronie: https://kiraevo.pl/buy`
          );
        } catch (dmError) {
          logger.warn(`Could not DM owner of ${guild.name}`);
        }

        // Zaktualizuj rekord gildi z nieważną licencją
        if (existingGuild) {
          await existingGuild.update({
            guildName: guild.name,
            licenseId: license.id,
            ownerId: guild.ownerId,
            isActive: true,
            leftAt: null,
            joinedAt: new Date()
          });
        } else {
          await models.Guild.create({
            guildId: guild.id,
            guildName: guild.name,
            licenseId: license.id,
            ownerId: guild.ownerId,
            isActive: true
          });
        }
        return;
      }

      const canAdd = await license.canAddServer();

      if (!canAdd) {
        logger.warn(`License for guild ${guild.name} has reached server limit - bot will be inactive`);
        try {
          const owner = await guild.fetchOwner();
          await owner.send(
            `⚠️ Bot na serwerze **${guild.name}** został dezaktywowany - licencja osiągnęła limit serwerów (${license.maxServers}).\n\n` +
            `**Wszystkie funkcje są zablokowane** do czasu ulepszenia licencji.\n` +
            `Ulepsz licencję na stronie: https://kiraevo.pl/buy`
          );
        } catch (dmError) {
          logger.warn(`Could not DM owner of ${guild.name}`);
        }

        // Utwórz rekord gildi, ale będzie nieaktywny ze względu na limit
        if (existingGuild) {
          await existingGuild.update({
            guildName: guild.name,
            licenseId: license.id,
            ownerId: guild.ownerId,
            isActive: true,
            leftAt: null,
            joinedAt: new Date()
          });
        } else {
          await models.Guild.create({
            guildId: guild.id,
            guildName: guild.name,
            licenseId: license.id,
            ownerId: guild.ownerId,
            isActive: true
          });
        }
        return;
      }

      // --- POPRAWKA: Sprawdź czy gildia już istnieje ---
      if (existingGuild) {
        // Aktualizacja istniejącego rekordu
        await existingGuild.update({
          guildName: guild.name,
          licenseId: license.id,
          ownerId: guild.ownerId,
          isActive: true,
          leftAt: null,
          joinedAt: new Date()
        });
        logger.info(`Guild ${guild.name} reactivated successfully with license ${license.licenseKey}`);
      } else {
        // Tworzenie nowego rekordu
        await models.Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          licenseId: license.id,
          ownerId: guild.ownerId,
          isActive: true
        });
        logger.info(`Guild ${guild.name} added successfully with license ${license.licenseKey}`);
      }
      // -----------------------------------------------

      try {
        const owner = await guild.fetchOwner();
        await owner.send(
          `Dziękuję za dodanie mnie do **${guild.name}**!\n\n` +
          `Poziom licencji: **${license.tier}**\n` +
          `Klucz licencji: ||${license.licenseKey}||\n\n` +
          `Użyj \`/help\` aby rozpocząć!`
        );
      } catch (dmError) {
        logger.warn(`Could not DM owner of ${guild.name}`);
      }

      // Cache invites for invite tracking
      try {
        await cacheGuildInvites(guild);
      } catch (inviteError) {
        logger.warn(`Could not cache invites for ${guild.name}: ${inviteError.message}`);
      }

      // Apply bot customization if previously configured
      try {
        const guildData = await models.Guild.findOne({
          where: { guildId: guild.id, isActive: true }
        });
        if (guildData?.settings) {
          await applyBotCustomization(guild, guildData.settings);
        }
      } catch (customizationError) {
        logger.warn(`Could not apply bot customization for ${guild.name}: ${customizationError.message}`);
      }
    } catch (error) {
      logger.error(`Error handling guild create for ${guild.name}:`, error);
      await guild.leave();
    }
  }
};