const { Giveaway } = require('@kira/shared/src/database/models');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const axios = require('axios');

async function getGiveaways(req, res) {
  try {
    const { guildId } = req.params;
    const { status } = req.query;

    const where = { guildId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const giveaways = await Giveaway.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.success(res, giveaways);
  } catch (error) {
    logger.error('Get giveaways error:', error);
    return ApiResponse.error(res, 'Failed to fetch giveaways', null, 500);
  }
}

async function getGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;

    const giveaway = await Giveaway.findOne({
      where: { id: giveawayId, guildId }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found', null, 404);
    }

    return ApiResponse.success(res, giveaway);
  } catch (error) {
    logger.error('Get giveaway error:', error);
    return ApiResponse.error(res, 'Failed to fetch giveaway', null, 500);
  }
}

async function deleteGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;

    const giveaway = await Giveaway.findOne({
      where: { id: giveawayId, guildId }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found', null, 404);
    }

    await giveaway.update({ status: 'cancelled' });

    // Update Discord message
    await updateGiveawayMessage(giveaway, 'cancelled');

    return ApiResponse.success(res, null, 'Giveaway cancelled successfully');
  } catch (error) {
    logger.error('Delete giveaway error:', error);
    return ApiResponse.error(res, 'Failed to cancel giveaway', null, 500);
  }
}

async function createGiveaway(req, res) {
  try {
    const { guildId } = req.params;
    const {
      prize,
      description,
      duration,
      winners,
      channelId,
      // Legacy single role
      requiredRole,
      // New fields
      requiredRoles,
      requiredRolesType,
      blacklistedRoles,
      minAccountAge,
      minServerTime,
      minLevel,
      minMessages,
      bonusEntries,
      embedColor,
      embedImage,
      embedThumbnail,
      dmWinners,
      winnerMessage,
      isDropGiveaway
    } = req.body;

    // Validate required fields
    if (!prize || !duration || !winners || !channelId) {
      return ApiResponse.error(res, 'Missing required fields: prize, duration, winners, channelId', null, 400);
    }

    // Parse duration (e.g., "1h", "2d", "30m")
    const durationMatch = duration.match(/^(\d+)([smhd])$/);
    if (!durationMatch) {
      return ApiResponse.error(res, 'Invalid duration format! Use: 30s, 5m, 2h, or 1d', null, 400);
    }

    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2];

    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const durationMs = amount * multipliers[unit];
    const endsAt = new Date(Date.now() + durationMs);

    // Build requirements text for embed
    const requirements = [];
    if (requiredRole) {
      requirements.push(`• Role: <@&${requiredRole}>`);
    }
    if (requiredRoles && requiredRoles.length > 0) {
      requirements.push(`• Roles (${requiredRolesType || 'any'}): ${requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (blacklistedRoles && blacklistedRoles.length > 0) {
      requirements.push(`• Blocked roles: ${blacklistedRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (minAccountAge) requirements.push(`• Min account age: ${minAccountAge} days`);
    if (minServerTime) requirements.push(`• Min server time: ${minServerTime} days`);
    if (minLevel) requirements.push(`• Min level: ${minLevel}`);
    if (minMessages) requirements.push(`• Min messages: ${minMessages}`);

    // Build bonus entries text
    let bonusText = '';
    if (bonusEntries && bonusEntries.length > 0) {
      bonusText = bonusEntries.map(b => `<@&${b.roleId}>: +${b.entries} entries`).join('\n');
    }

    // Create embed for Discord message
    const color = embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x9333ea;
    const embed = {
      title: isDropGiveaway ? '🎁 DROP GIVEAWAY 🎁' : '🎉 GIVEAWAY 🎉',
      description: `**Prize:** ${prize}\n\n${description || 'Click the button below to enter!'}`,
      fields: [
        { name: 'Winners', value: `${winners}`, inline: true },
        { name: 'Ends At', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true },
        { name: 'Hosted By', value: 'Dashboard', inline: true }
      ],
      color: color,
      footer: { text: `${winners} winner(s) | Ends` },
      timestamp: endsAt.toISOString()
    };

    if (isDropGiveaway) {
      embed.fields.push({ name: 'Type', value: '🎁 First to click wins!', inline: false });
    }

    if (requirements.length > 0) {
      embed.fields.push({ name: '📋 Requirements', value: requirements.join('\n'), inline: false });
    }

    if (bonusText) {
      embed.fields.push({ name: '⭐ Bonus Entries', value: bonusText, inline: false });
    }

    if (embedImage) embed.image = { url: embedImage };
    if (embedThumbnail) embed.thumbnail = { url: embedThumbnail };

    // Create button
    const button = {
      type: 1,
      components: [{
        type: 2,
        style: 1,
        label: 'Enter Giveaway',
        custom_id: 'giveaway_enter',
        emoji: { name: '🎉' }
      }]
    };

    // Send message to Discord
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      logger.error('Bot token not configured');
      return ApiResponse.error(res, 'Bot token not configured', null, 500);
    }

    const messageResponse = await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        embeds: [embed],
        components: [button]
      },
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const messageId = messageResponse.data.id;

    // Save to database
    const giveaway = await Giveaway.create({
      guildId,
      channelId,
      messageId,
      prize,
      description: description || null,
      winners,
      endsAt,
      createdBy: req.user.discordId,
      participants: [],
      requiredRole: requiredRole || null,
      requiredRoles: requiredRoles || null,
      requiredRolesType: requiredRolesType || 'any',
      blacklistedRoles: blacklistedRoles || null,
      minAccountAge: minAccountAge || null,
      minServerTime: minServerTime || null,
      minLevel: minLevel || null,
      minMessages: minMessages || null,
      bonusEntries: bonusEntries || null,
      embedColor: embedColor || '#9333ea',
      embedImage: embedImage || null,
      embedThumbnail: embedThumbnail || null,
      dmWinners: dmWinners !== false,
      winnerMessage: winnerMessage || null,
      isDropGiveaway: isDropGiveaway || false,
      status: 'active'
    });

    return ApiResponse.success(res, giveaway, 'Giveaway created successfully');
  } catch (error) {
    logger.error('Create giveaway error:', error);
    if (error.response?.data) {
      logger.error('Discord API error:', error.response.data);
    }
    return ApiResponse.error(res, 'Failed to create giveaway', null, 500);
  }
}

async function endGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId,
        status: { [Op.in]: ['active', 'paused'] }
      }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found or already ended', null, 404);
    }

    const participants = giveaway.participants || [];

    if (participants.length === 0) {
      await giveaway.update({ status: 'ended', winnersList: [], winnerIds: [] });
      await updateGiveawayMessage(giveaway, 'ended_no_winners');
      return ApiResponse.success(res, { winners: [] }, 'Giveaway ended with no participants');
    }

    // Pick winners
    const winnersCount = Math.min(giveaway.winners, participants.length);
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const winnerIds = shuffled.slice(0, winnersCount);

    await giveaway.update({
      status: 'ended',
      winnersList: winnerIds,
      winnerIds: winnerIds
    });

    // Update Discord message
    await updateGiveawayMessage(giveaway, 'ended', winnerIds);

    // Announce winners
    await announceWinners(giveaway, winnerIds);

    return ApiResponse.success(res, { winners: winnerIds }, 'Giveaway ended successfully');
  } catch (error) {
    logger.error('End giveaway error:', error);
    return ApiResponse.error(res, 'Failed to end giveaway', null, 500);
  }
}

async function rerollGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;
    const { winners: newWinnersCount } = req.body;

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId,
        status: 'ended'
      }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found or not ended', null, 404);
    }

    const participants = giveaway.participants || [];
    const previousWinners = giveaway.winnerIds || [];

    // Filter out previous winners
    const eligibleParticipants = participants.filter(p => !previousWinners.includes(p));

    if (eligibleParticipants.length === 0) {
      return ApiResponse.error(res, 'No eligible participants for reroll', null, 400);
    }

    const count = newWinnersCount || giveaway.winners;
    const winnersCount = Math.min(count, eligibleParticipants.length);

    const shuffled = [...eligibleParticipants].sort(() => 0.5 - Math.random());
    const newWinnerIds = shuffled.slice(0, winnersCount);

    // Update database
    await giveaway.update({
      winnersList: [...(giveaway.winnersList || []), ...newWinnerIds],
      winnerIds: [...previousWinners, ...newWinnerIds]
    });

    // Announce new winners
    await announceReroll(giveaway, newWinnerIds);

    return ApiResponse.success(res, { winners: newWinnerIds }, 'Giveaway rerolled successfully');
  } catch (error) {
    logger.error('Reroll giveaway error:', error);
    return ApiResponse.error(res, 'Failed to reroll giveaway', null, 500);
  }
}

async function pauseGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId,
        status: 'active'
      }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found or not active', null, 404);
    }

    const now = new Date();
    const timeRemaining = new Date(giveaway.endsAt).getTime() - now.getTime();

    await giveaway.update({
      status: 'paused',
      pausedAt: now,
      pausedTimeRemaining: timeRemaining
    });

    // Update Discord message
    await updateGiveawayMessage(giveaway, 'paused');

    return ApiResponse.success(res, giveaway, 'Giveaway paused successfully');
  } catch (error) {
    logger.error('Pause giveaway error:', error);
    return ApiResponse.error(res, 'Failed to pause giveaway', null, 500);
  }
}

async function resumeGiveaway(req, res) {
  try {
    const { guildId, giveawayId } = req.params;

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId,
        status: 'paused'
      }
    });

    if (!giveaway) {
      return ApiResponse.error(res, 'Giveaway not found or not paused', null, 404);
    }

    const newEndsAt = new Date(Date.now() + giveaway.pausedTimeRemaining);

    await giveaway.update({
      status: 'active',
      endsAt: newEndsAt,
      pausedAt: null,
      pausedTimeRemaining: null
    });

    // Update Discord message
    await updateGiveawayMessage(giveaway, 'resumed', null, newEndsAt);

    return ApiResponse.success(res, { ...giveaway.toJSON(), endsAt: newEndsAt }, 'Giveaway resumed successfully');
  } catch (error) {
    logger.error('Resume giveaway error:', error);
    return ApiResponse.error(res, 'Failed to resume giveaway', null, 500);
  }
}

// Helper function to update Discord message
async function updateGiveawayMessage(giveaway, action, winnerIds = null, newEndsAt = null) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !giveaway.messageId) return;

  try {
    let embed;
    let components = [];

    const color = giveaway.embedColor ? parseInt(giveaway.embedColor.replace('#', ''), 16) : 0x9333ea;

    switch (action) {
      case 'cancelled':
        embed = {
          title: '🎉 Giveaway Cancelled 🎉',
          description: `**Prize:** ${giveaway.prize}\n\n❌ This giveaway has been cancelled.`,
          color: 0xED4245,
          footer: { text: 'Cancelled' },
          timestamp: new Date().toISOString()
        };
        break;

      case 'ended_no_winners':
        embed = {
          title: '🎉 Giveaway Ended 🎉',
          description: `**Prize:** ${giveaway.prize}\n\n❌ No valid entries! No winners could be determined.`,
          color: 0xED4245,
          footer: { text: 'Ended' },
          timestamp: new Date().toISOString()
        };
        break;

      case 'ended':
        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
        embed = {
          title: '🎉 Giveaway Ended 🎉',
          description: `**Prize:** ${giveaway.prize}\n\n**${winnerIds.length === 1 ? 'Winner' : 'Winners'}:**\n${winnerMentions}`,
          color: 0x57F287,
          footer: { text: 'Ended' },
          timestamp: new Date().toISOString()
        };
        break;

      case 'paused':
        embed = {
          title: giveaway.isDropGiveaway ? '🎁 DROP GIVEAWAY 🎁' : '🎉 GIVEAWAY 🎉',
          description: `**Prize:** ${giveaway.prize}\n\n${giveaway.description || 'Click the button below to enter!'}`,
          fields: [
            { name: 'Winners', value: `${giveaway.winners}`, inline: true },
            { name: 'Status', value: '⏸️ Paused', inline: true },
            { name: 'Hosted By', value: `<@${giveaway.createdBy}>`, inline: true }
          ],
          color: color,
          footer: { text: `${giveaway.winners} winner(s) | PAUSED` }
        };
        components = [{
          type: 1,
          components: [{
            type: 2,
            style: 1,
            label: `Enter Giveaway (${giveaway.participants?.length || 0})`,
            custom_id: 'giveaway_enter',
            emoji: { name: '🎉' },
            disabled: true
          }]
        }];
        break;

      case 'resumed':
        embed = {
          title: giveaway.isDropGiveaway ? '🎁 DROP GIVEAWAY 🎁' : '🎉 GIVEAWAY 🎉',
          description: `**Prize:** ${giveaway.prize}\n\n${giveaway.description || 'Click the button below to enter!'}`,
          fields: [
            { name: 'Winners', value: `${giveaway.winners}`, inline: true },
            { name: 'Ends At', value: `<t:${Math.floor(newEndsAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Hosted By', value: `<@${giveaway.createdBy}>`, inline: true }
          ],
          color: color,
          footer: { text: `${giveaway.winners} winner(s) | Ends` },
          timestamp: newEndsAt.toISOString()
        };
        components = [{
          type: 1,
          components: [{
            type: 2,
            style: 1,
            label: `Enter Giveaway (${giveaway.participants?.length || 0})`,
            custom_id: 'giveaway_enter',
            emoji: { name: '🎉' }
          }]
        }];
        break;
    }

    if (giveaway.embedImage && embed) embed.image = { url: giveaway.embedImage };
    if (giveaway.embedThumbnail && embed) embed.thumbnail = { url: giveaway.embedThumbnail };

    await axios.patch(
      `https://discord.com/api/v10/channels/${giveaway.channelId}/messages/${giveaway.messageId}`,
      {
        embeds: [embed],
        components: components
      },
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.error('Failed to update giveaway message:', error.response?.data || error.message);
  }
}

// Helper function to announce winners
async function announceWinners(giveaway, winnerIds) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  try {
    const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
    await axios.post(
      `https://discord.com/api/v10/channels/${giveaway.channelId}/messages`,
      {
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
        message_reference: { message_id: giveaway.messageId }
      },
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.error('Failed to announce winners:', error.response?.data || error.message);
  }
}

// Helper function to announce reroll
async function announceReroll(giveaway, winnerIds) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  try {
    const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
    await axios.post(
      `https://discord.com/api/v10/channels/${giveaway.channelId}/messages`,
      {
        content: `🎉 **Reroll!** New winner(s): ${winnerMentions}! Congratulations, you won **${giveaway.prize}**!`,
        message_reference: { message_id: giveaway.messageId }
      },
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.error('Failed to announce reroll:', error.response?.data || error.message);
  }
}

module.exports = {
  getGiveaways,
  getGiveaway,
  deleteGiveaway,
  createGiveaway,
  endGiveaway,
  rerollGiveaway,
  pauseGiveaway,
  resumeGiveaway
};
