const { models } = require('@kira/shared');
const { Op } = require('sequelize');
const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');

const REMINDER_DAYS = 7;
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

async function checkExpiringLicenses(client) {
  try {
    const now = new Date();
    const reminderDate = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000);

    const expiringLicenses = await models.License.findAll({
      where: {
        isActive: true,
        expiresAt: {
          [Op.not]: null,
          [Op.lte]: reminderDate,
          [Op.gt]: now
        },
        [Op.or]: [
          { '$metadata.reminderSent$': null },
          { '$metadata.reminderSent$': false }
        ]
      },
      include: [{
        model: models.Guild,
        as: 'guilds',
        where: { isActive: true },
        required: true
      }]
    });

    for (const license of expiringLicenses) {
      for (const guild of license.guilds) {
        await sendReminderToOwner(client, license, guild);
      }

      const metadata = license.metadata || {};
      metadata.reminderSent = true;
      metadata.reminderSentAt = new Date().toISOString();
      await license.update({ metadata });
    }

    if (expiringLicenses.length > 0) {
      logger.info(`License reminder: Sent ${expiringLicenses.length} reminders`);
    }
  } catch (error) {
    logger.error('License reminder check error:', error);
  }
}

async function sendReminderToOwner(client, license, guildData) {
  try {
    const discordGuild = await client.guilds.fetch(guildData.guildId).catch(() => null);
    if (!discordGuild) return;

    const owner = await discordGuild.fetchOwner().catch(() => null);
    if (!owner) return;

    const daysLeft = Math.ceil((license.expiresAt - new Date()) / (24 * 60 * 60 * 1000));

    const embed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('⚠️ Przypomnienie o licencji')
      .setDescription(
        `Twoja licencja **${license.tier}** dla serwera **${discordGuild.name}** wygasa za **${daysLeft} dni**!\n\n` +
        `📅 Data wygaśnięcia: **${license.expiresAt.toLocaleDateString('pl-PL')}**\n\n` +
        `Odnów licencję, aby zachować dostęp do wszystkich funkcji bota.`
      )
      .addFields(
        { name: '🔑 Klucz licencji', value: `\`${license.licenseKey.substring(0, 8)}...${license.licenseKey.slice(-4)}\``, inline: true },
        { name: '📊 Tier', value: license.tier, inline: true }
      )
      .setFooter({ text: 'KiraEvo - https://kiraevo.pl/buy' })
      .setTimestamp();

    await owner.send({ embeds: [embed] });
    logger.info(`License reminder sent to ${owner.user.tag} for guild ${discordGuild.name}`);
  } catch (error) {
    if (error.code === 50007) {
      logger.warn(`Cannot send DM to guild owner (DMs disabled)`);
    } else {
      logger.error('Error sending license reminder:', error);
    }
  }
}

function startLicenseReminderScheduler(client) {
  logger.info('Starting license reminder scheduler');

  setTimeout(() => checkExpiringLicenses(client), 10000);

  setInterval(() => checkExpiringLicenses(client), CHECK_INTERVAL);
}

module.exports = { startLicenseReminderScheduler, checkExpiringLicenses };
