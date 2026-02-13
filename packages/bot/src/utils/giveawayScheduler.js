const { models } = require('@kira/shared');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('./logger');
const { Op } = require('sequelize');

// Build weighted entry pool with bonus entries
function buildEntryPool(participants, bonusEntries, memberRoles) {
  const pool = [];

  for (const userId of participants) {
    // Base entry
    pool.push(userId);

    // Bonus entries based on roles
    if (bonusEntries && bonusEntries.length > 0 && memberRoles.has(userId)) {
      const userRoles = memberRoles.get(userId);
      for (const bonus of bonusEntries) {
        if (userRoles.includes(bonus.roleId)) {
          // Add extra entries
          for (let i = 0; i < bonus.entries; i++) {
            pool.push(userId);
          }
        }
      }
    }
  }

  return pool;
}

// Pick unique winners from pool
function pickWinners(pool, count) {
  const winners = [];
  const poolCopy = [...pool];

  while (winners.length < count && poolCopy.length > 0) {
    const randomIndex = Math.floor(Math.random() * poolCopy.length);
    const winnerId = poolCopy[randomIndex];

    // Remove all instances of this winner from the pool
    if (!winners.includes(winnerId)) {
      winners.push(winnerId);
    }

    // Remove this specific entry
    poolCopy.splice(randomIndex, 1);
  }

  return winners;
}

// Send DM to winners
async function sendWinnerDM(client, giveaway, winner, guild) {
  if (!giveaway.dmWinners) return;

  try {
    const user = await client.users.fetch(winner);

    let message = giveaway.winnerMessage || `Congratulations! You won **${giveaway.prize}** in the giveaway on **${guild.name}**!`;

    // Replace placeholders
    message = message
      .replace(/{prize}/g, giveaway.prize)
      .replace(/{server}/g, guild.name)
      .replace(/{user}/g, user.username);

    const embed = new EmbedBuilder()
      .setTitle('🎉 You Won a Giveaway!')
      .setDescription(message)
      .setColor('#57F287')
      .addFields(
        { name: 'Prize', value: giveaway.prize, inline: true },
        { name: 'Server', value: guild.name, inline: true }
      )
      .setFooter({ text: 'KiraEvo Giveaways' })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    logger.info(`Sent winner DM to ${user.tag} for giveaway ${giveaway.id}`);
  } catch (err) {
    logger.error(`Failed to send winner DM to ${winner}:`, err.message);
  }
}

// End a giveaway
async function endGiveaway(client, giveaway) {
  try {
    const guild = await client.guilds.fetch(giveaway.guildId);
    if (!guild) {
      logger.error(`Guild not found for giveaway ${giveaway.id}`);
      return;
    }

    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) {
      logger.error(`Channel not found for giveaway ${giveaway.id}`);
      await giveaway.update({ status: 'ended', winnersList: [] });
      return;
    }

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

    const participants = giveaway.participants || [];

    if (participants.length === 0) {
      // No participants
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Ended 🎉')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No valid entries! No winners could be determined.`)
        .setColor('#ED4245')
        .setTimestamp();

      if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
      if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

      if (message) {
        await message.edit({ embeds: [embed], components: [] });
        await message.reply({ content: '❌ No one entered the giveaway!' });
      }

      await giveaway.update({ status: 'ended', winnersList: [], winnerIds: [] });
      return;
    }

    // Get member roles for bonus entries
    const memberRoles = new Map();
    if (giveaway.bonusEntries && giveaway.bonusEntries.length > 0) {
      for (const userId of participants) {
        try {
          const member = await guild.members.fetch(userId);
          memberRoles.set(userId, Array.from(member.roles.cache.keys()));
        } catch (err) {
          // Member left
        }
      }
    }

    // Build entry pool with bonus entries
    const pool = buildEntryPool(participants, giveaway.bonusEntries, memberRoles);

    // Pick winners
    const winnersCount = Math.min(giveaway.winners, participants.length);
    const winnerIds = pickWinners(pool, winnersCount);

    // Fetch winner users
    const winners = [];
    for (const winnerId of winnerIds) {
      try {
        const user = await client.users.fetch(winnerId);
        winners.push(user);
      } catch (err) {
        logger.error(`Failed to fetch user ${winnerId}:`, err);
      }
    }

    if (winners.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Ended 🎉')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ Could not determine winners!`)
        .setColor('#ED4245')
        .setTimestamp();

      if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
      if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

      if (message) {
        await message.edit({ embeds: [embed], components: [] });
      }
      await giveaway.update({ status: 'ended', winnersList: [], winnerIds: [] });
      return;
    }

    // Update message
    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Ended 🎉')
      .setDescription(`**Prize:** ${giveaway.prize}\n\n**${winners.length === 1 ? 'Winner' : 'Winners'}:**\n${winners.map(w => `<@${w.id}>`).join(', ')}`)
      .setColor(giveaway.embedColor || '#57F287')
      .setFooter({ text: 'Ended' })
      .setTimestamp();

    if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
    if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

    if (message) {
      await message.edit({ embeds: [embed], components: [] });

      // Announce winners
      const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');
      await message.reply({
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`
      });
    }

    // Send DMs to winners
    for (const winner of winners) {
      await sendWinnerDM(client, giveaway, winner.id, guild);
    }

    // Update database
    await giveaway.update({
      status: 'ended',
      winnersList: winners.map(w => w.tag),
      winnerIds: winners.map(w => w.id)
    });

    logger.info(`Giveaway ${giveaway.id} ended. Winners: ${winners.map(w => w.tag).join(', ')}`);

  } catch (error) {
    logger.error(`Error ending giveaway ${giveaway.id}:`, error);
  }
}

// Reroll giveaway winners
async function rerollGiveaway(client, giveaway, newWinnersCount = null) {
  try {
    const guild = await client.guilds.fetch(giveaway.guildId);
    if (!guild) return [];

    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(giveaway.messageId).catch(() => null) : null;

    const participants = giveaway.participants || [];
    const previousWinners = giveaway.winnerIds || [];

    // Filter out previous winners
    const eligibleParticipants = participants.filter(p => !previousWinners.includes(p));

    if (eligibleParticipants.length === 0) {
      return [];
    }

    const count = newWinnersCount || giveaway.winners;
    const winnersCount = Math.min(count, eligibleParticipants.length);

    // Get member roles for bonus entries
    const memberRoles = new Map();
    if (giveaway.bonusEntries && giveaway.bonusEntries.length > 0) {
      for (const userId of eligibleParticipants) {
        try {
          const member = await guild.members.fetch(userId);
          memberRoles.set(userId, Array.from(member.roles.cache.keys()));
        } catch (err) {
          // Member left
        }
      }
    }

    // Build pool and pick winners
    const pool = buildEntryPool(eligibleParticipants, giveaway.bonusEntries, memberRoles);
    const winnerIds = pickWinners(pool, winnersCount);

    const winners = [];
    for (const winnerId of winnerIds) {
      try {
        const user = await client.users.fetch(winnerId);
        winners.push(user);
      } catch (err) {
        logger.error(`Failed to fetch user ${winnerId}:`, err);
      }
    }

    if (winners.length > 0 && message) {
      const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');
      await message.reply({
        content: `🎉 **Reroll!** New winner(s): ${winnerMentions}! Congratulations, you won **${giveaway.prize}**!`
      });
    }

    // Send DMs to new winners
    for (const winner of winners) {
      await sendWinnerDM(client, giveaway, winner.id, guild);
    }

    // Update database with new winners
    await giveaway.update({
      winnersList: [...(giveaway.winnersList || []), ...winners.map(w => w.tag)],
      winnerIds: [...previousWinners, ...winners.map(w => w.id)]
    });

    logger.info(`Giveaway ${giveaway.id} rerolled. New winners: ${winners.map(w => w.tag).join(', ')}`);

    return winners;

  } catch (error) {
    logger.error(`Error rerolling giveaway ${giveaway.id}:`, error);
    return [];
  }
}

// Handle drop giveaway instant win
async function handleDropGiveawayWin(client, giveaway, guild, channel, message) {
  try {
    const participants = giveaway.participants || [];
    const winners = [];

    for (const winnerId of participants) {
      try {
        const user = await client.users.fetch(winnerId);
        winners.push(user);
      } catch (err) {
        // User not found
      }
    }

    // Update message
    const embed = new EmbedBuilder()
      .setTitle('🎁 Drop Giveaway Ended! 🎁')
      .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):**\n${winners.map(w => `<@${w.id}>`).join(', ')}`)
      .setColor(giveaway.embedColor || '#57F287')
      .setFooter({ text: 'Claimed!' })
      .setTimestamp();

    if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
    if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

    await message.edit({ embeds: [embed], components: [] });

    // Announce
    const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');
    await message.reply({
      content: `🎁 ${winnerMentions} claimed **${giveaway.prize}**!`
    });

    // Send DMs
    for (const winner of winners) {
      await sendWinnerDM(client, giveaway, winner.id, guild);
    }

    // Update database
    await giveaway.update({
      status: 'ended',
      winnersList: winners.map(w => w.tag),
      winnerIds: winners.map(w => w.id)
    });

    logger.info(`Drop giveaway ${giveaway.id} claimed by: ${winners.map(w => w.tag).join(', ')}`);

  } catch (error) {
    logger.error(`Error handling drop giveaway ${giveaway.id}:`, error);
  }
}

async function checkAndEndGiveaways(client) {
  try {
    const now = new Date();

    // Find all active giveaways that have ended (skip paused ones)
    const endedGiveaways = await models.Giveaway.findAll({
      where: {
        status: 'active',
        endsAt: {
          [Op.lte]: now
        }
      }
    });

    for (const giveaway of endedGiveaways) {
      await endGiveaway(client, giveaway);
    }

  } catch (error) {
    logger.error('Giveaway scheduler error:', error);
  }
}

function startGiveawayScheduler(client) {
  // Check every 30 seconds
  setInterval(() => {
    checkAndEndGiveaways(client);
  }, 30000);

  logger.info('Giveaway scheduler started');
}

module.exports = {
  startGiveawayScheduler,
  endGiveaway,
  rerollGiveaway,
  handleDropGiveawayWin,
  buildEntryPool,
  pickWinners,
  sendWinnerDM
};
