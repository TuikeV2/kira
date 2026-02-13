const { models, sequelize } = require('@kira/shared');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const discordOAuth = require('../utils/discord-oauth');
const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs').promises;
const path = require('path');

const BACKUPS_DIR = path.join(__dirname, '../../backups');

async function generateSectionImage(base64Image, text, options = {}) {
    const {
        fontFamily = 'sans-serif',
        fontSize = 40,
        fontWeight = 'bold',
        textColor = '#ffffff',
        gradientColors = null, // array like ['#ff0000', '#0000ff'] for gradient
        gradientDirection = 'horizontal', // 'horizontal', 'vertical', 'diagonal'
        showBorder = false,
        borderColor = '#ffffff',
        overlayOpacity = 0.4
    } = options;

    const canvas = createCanvas(700, 200);
    const context = canvas.getContext('2d');

    if (base64Image && base64Image.startsWith('data:image')) {
        const base64Data = base64Image.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const background = await loadImage(buffer);
        const scale = Math.max(canvas.width / background.width, canvas.height / background.height);
        const x = (canvas.width / 2) - (background.width / 2) * scale;
        const y = (canvas.height / 2) - (background.height / 2) * scale;
        context.drawImage(background, x, y, background.width * scale, background.height * scale);
    } else {
        context.fillStyle = '#2b2d31';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dark overlay
    context.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Optional border
    if (showBorder) {
        context.strokeStyle = borderColor;
        context.lineWidth = 3;
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    }

    // Text styling
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0,0,0,0.8)';
    context.shadowBlur = 10;

    // Apply gradient or solid color
    if (gradientColors && gradientColors.length >= 2) {
        let gradient;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const textMetrics = context.measureText(text.toUpperCase());
        const textWidth = textMetrics.width;

        if (gradientDirection === 'vertical') {
            gradient = context.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
        } else if (gradientDirection === 'diagonal') {
            gradient = context.createLinearGradient(centerX - textWidth/2, centerY - fontSize/2, centerX + textWidth/2, centerY + fontSize/2);
        } else {
            gradient = context.createLinearGradient(centerX - textWidth/2, centerY, centerX + textWidth/2, centerY);
        }

        gradientColors.forEach((color, index) => {
            gradient.addColorStop(index / (gradientColors.length - 1), color);
        });
        context.fillStyle = gradient;
    } else {
        context.fillStyle = textColor;
    }

    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

    return canvas.toBuffer('image/png');
}

async function getStats(req, res) {
  try {
    const totalServers = await models.Guild.count({ where: { isActive: true } });
    const totalLicenses = await models.License.count({ where: { isActive: true } });
    const totalCommands = await models.CommandUsage.count();
    const totalWarnings = await models.Warning.count({ where: { isActive: true } });
    const totalMutes = await models.Mute.count({ where: { isActive: true } });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const commandsToday = await models.CommandUsage.count({
      where: { executedAt: { [Op.gte]: last24Hours } }
    });

    const licenseStats = await models.License.findAll({
      attributes: ['tier', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { isActive: true },
      group: ['tier']
    });

    const topCommands = await models.CommandUsage.findAll({
      attributes: ['commandName', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { executedAt: { [Op.gte]: last24Hours } },
      group: ['commandName'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5
    });

    return ApiResponse.success(res, {
      totalServers,
      totalLicenses,
      totalCommands,
      totalWarnings,
      totalMutes,
      commandsToday,
      licensesByTier: licenseStats.reduce((acc, stat) => {
        acc[stat.tier] = parseInt(stat.getDataValue('count'));
        return acc;
      }, {}),
      topCommands: topCommands.map(cmd => ({
        name: cmd.commandName,
        count: parseInt(cmd.getDataValue('count'))
      }))
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    return ApiResponse.error(res, 'Failed to fetch statistics', null, 500);
  }
}

async function getServers(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: guilds, count } = await models.Guild.findAndCountAll({
      where: { isActive: true },
      include: [{ model: models.License, as: 'license', attributes: ['licenseKey', 'tier', 'expiresAt'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['joined_at', 'DESC']]
    });

    return ApiResponse.paginated(res, guilds, page, limit, count);
  } catch (error) {
    logger.error('Get servers error:', error);
    return ApiResponse.error(res, 'Failed to fetch servers', null, 500);
  }
}

async function getCommandStats(req, res) {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const commandStats = await models.CommandUsage.findAll({
      attributes: [
        'commandName',
        [sequelize.fn('DATE', sequelize.col('executed_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { executedAt: { [Op.gte]: startDate } },
      group: ['commandName', sequelize.fn('DATE', sequelize.col('executed_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('executed_at')), 'ASC']]
    });

    const formatted = commandStats.reduce((acc, stat) => {
      const command = stat.commandName;
      const date = stat.getDataValue('date');
      const count = parseInt(stat.getDataValue('count'));

      if (!acc[command]) acc[command] = [];
      acc[command].push({ date, count });
      return acc;
    }, {});

    return ApiResponse.success(res, formatted);
  } catch (error) {
    logger.error('Get command stats error:', error);
    return ApiResponse.error(res, 'Failed to fetch command statistics', null, 500);
  }
}

async function getActivity(req, res) {
  try {
    const { limit = 50 } = req.query;
    const recentActivity = await models.ModerationLog.findAll({
      limit: parseInt(limit),
      order: [['created_at', 'DESC']],
      include: [{ model: models.Guild, as: 'guild', attributes: ['guildName'] }]
    });
    return ApiResponse.success(res, recentActivity);
  } catch (error) {
    logger.error('Get activity error:', error);
    return ApiResponse.error(res, 'Failed to fetch activity', null, 500);
  }
}

async function getUserGuilds(req, res) {
  try {
    const user = await models.User.findByPk(req.user.userId);
    if (!user) return ApiResponse.error(res, 'User not found', null, 404);

    let accessToken = user.accessToken;
    if (!accessToken) return ApiResponse.error(res, 'No Discord access token found. Please log in again.', null, 401);

    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      try {
        const tokenData = await discordOAuth.refreshAccessToken(user.refreshToken);
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        await user.update({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: expiresAt
        });
        accessToken = tokenData.access_token;
      } catch (error) {
        logger.error('Token refresh error:', error);
        return ApiResponse.error(res, 'Failed to refresh Discord token. Please log in again.', null, 401);
      }
    }

    const guilds = await discordOAuth.getUserGuilds(accessToken);
    const guildsWithPermissions = guilds.filter(guild => {
      const permissions = parseInt(guild.permissions);
      const hasManageGuild = (permissions & 0x20) === 0x20;
      const isOwner = guild.owner === true;
      return hasManageGuild || isOwner;
    });

    const guildIds = guildsWithPermissions.map(g => g.id);
    const registeredGuilds = await models.Guild.findAll({
      where: { guildId: guildIds },
      include: [{ model: models.License, as: 'license', attributes: ['licenseKey', 'tier', 'expiresAt'] }]
    });

    const guildMap = registeredGuilds.reduce((acc, guild) => {
      acc[guild.guildId] = guild;
      return acc;
    }, {});

    const enrichedGuilds = guildsWithPermissions.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      permissions: guild.permissions,
      registered: !!guildMap[guild.id],
      license: guildMap[guild.id]?.license || null,
      isActive: guildMap[guild.id]?.isActive || false
    }));

    return ApiResponse.success(res, enrichedGuilds);
  } catch (error) {
    logger.error('Get user guilds error:', error);
    return ApiResponse.error(res, 'Failed to fetch guilds', null, 500);
  }
}

async function getGuildDetails(req, res) {
  try {
    const { guildId } = req.params;
    const guild = await models.Guild.findOne({
      where: { guildId },
      include: [{ model: models.License, as: 'license', attributes: ['licenseKey', 'tier', 'expiresAt', 'maxServers'] }]
    });

    if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);
    return ApiResponse.success(res, guild);
  } catch (error) {
    logger.error('Get guild details error:', error);
    return ApiResponse.error(res, 'Failed to fetch server details', null, 500);
  }
}

async function updateGuildSettings(req, res) {
  try {
    const { guildId } = req.params;
    const { settings } = req.body;
    const guild = await models.Guild.findOne({ where: { guildId } });

    if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

    // Validate automod settings if present
    if (settings.automod) {
      const a = settings.automod;

      // Numeric ranges
      if (a.duplicateMaxCount && (a.duplicateMaxCount < 2 || a.duplicateMaxCount > 10)) {
        return ApiResponse.error(res, 'Duplicate count must be between 2-10', null, 400);
      }
      if (a.floodMaxMessages && (a.floodMaxMessages < 3 || a.floodMaxMessages > 20)) {
        return ApiResponse.error(res, 'Flood messages must be between 3-20', null, 400);
      }
      if (a.capsPercentage && (a.capsPercentage < 50 || a.capsPercentage > 100)) {
        return ApiResponse.error(res, 'Caps percentage must be between 50-100', null, 400);
      }
      if (a.maxEmojis && (a.maxEmojis < 5 || a.maxEmojis > 50)) {
        return ApiResponse.error(res, 'Max emojis must be between 5-50', null, 400);
      }
      if (a.maxMentions && (a.maxMentions < 3 || a.maxMentions > 20)) {
        return ApiResponse.error(res, 'Max mentions must be between 3-20', null, 400);
      }
      if (a.violationDecayHours && (a.violationDecayHours < 1 || a.violationDecayHours > 168)) {
        return ApiResponse.error(res, 'Violation decay must be between 1-168 hours', null, 400);
      }

      // Escalation thresholds
      if (a.escalation) {
        const thresholdKeys = ['warn', 'mute1h', 'mute24h', 'kick', 'ban'];
        for (const key of thresholdKeys) {
          if (a.escalation[key] && (a.escalation[key] < 1 || a.escalation[key] > 10)) {
            return ApiResponse.error(res, `Escalation threshold '${key}' must be between 1-10`, null, 400);
          }
        }
      }
    }

    await guild.update({
      settings: { ...guild.settings, ...settings }
    });

    return ApiResponse.success(res, guild, 'Server settings updated successfully');
  } catch (error) {
    logger.error('Update guild settings error:', error);
    return ApiResponse.error(res, 'Failed to update server settings', null, 500);
  }
}

async function getGuildChannels(req, res) {
  try {
    const { guildId } = req.params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      logger.error('Bot token not configured');
      return ApiResponse.error(res, 'Bot configuration error', null, 500);
    }

    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    
    const channels = response.data
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parentId: channel.parent_id,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rate_limit_per_user,
        bitrate: channel.bitrate,
        userLimit: channel.user_limit,
        permissionOverwrites: channel.permission_overwrites 
      }))
      .sort((a, b) => {
         if (a.type === 4 && b.type !== 4) return -1;
         if (a.type !== 4 && b.type === 4) return 1;
         return a.position - b.position;
      });

    return ApiResponse.success(res, channels);
  } catch (error) {
    logger.error(`Get guild channels error for ${req.params.guildId}:`, error.message);
    if (error.response && error.response.status === 404) {
        return ApiResponse.error(res, 'Bot is not on this server', null, 404);
    }
    return ApiResponse.error(res, 'Failed to fetch channels from Discord', null, 500);
  }
}

async function createChannel(req, res) {
  try {
    const { guildId } = req.params;
    const { 
        name, type, parentId, topic, nsfw, position, permissionOverwrites,
        rateLimitPerUser, userLimit, bitrate
    } = req.body;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const validParentId = parentId && parentId.trim() !== '' ? parentId : null;

    const payload = {
      name,
      type: parseInt(type),
      topic,
      nsfw: !!nsfw,
      position: position !== undefined ? parseInt(position) : undefined,
      parent_id: validParentId,
      permission_overwrites: permissionOverwrites,
      rate_limit_per_user: rateLimitPerUser ? parseInt(rateLimitPerUser) : 0,
      user_limit: userLimit ? parseInt(userLimit) : 0,
      bitrate: bitrate ? parseInt(bitrate) : undefined
    };

    const response = await axios.post(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      payload,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    return ApiResponse.success(res, response.data, 'Channel created successfully');
  } catch (error) {
    logger.error('Create channel error:', error.response?.data || error.message);
    return ApiResponse.error(res, 'Failed to create channel', error.response?.data, 500);
  }
}

async function updateChannel(req, res) {
  try {
    const { channelId } = req.params;
    const { 
        name, topic, nsfw, position, parentId, permissionOverwrites,
        rateLimitPerUser, userLimit, bitrate
    } = req.body;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const validParentId = parentId && parentId.trim() !== '' ? parentId : null;

    const payload = {
      name,
      topic,
      nsfw: !!nsfw,
      position: position !== undefined ? parseInt(position) : undefined,
      parent_id: validParentId,
      permission_overwrites: permissionOverwrites,
      rate_limit_per_user: rateLimitPerUser ? parseInt(rateLimitPerUser) : 0,
      user_limit: userLimit ? parseInt(userLimit) : 0,
      bitrate: bitrate ? parseInt(bitrate) : undefined
    };

    const response = await axios.patch(
      `https://discord.com/api/v10/channels/${channelId}`,
      payload,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    return ApiResponse.success(res, response.data, 'Channel updated successfully');
  } catch (error) {
    logger.error('Update channel error:', error.response?.data || error.message);
    return ApiResponse.error(res, 'Failed to update channel', error.response?.data, 500);
  }
}

async function deleteChannel(req, res) {
  try {
    const { channelId } = req.params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    await axios.delete(
      `https://discord.com/api/v10/channels/${channelId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    return ApiResponse.success(res, null, 'Channel deleted successfully');
  } catch (error) {
    logger.error('Delete channel error:', error.response?.data || error.message);
    return ApiResponse.error(res, 'Failed to delete channel', error.response?.data, 500);
  }
}

async function reorderChannels(req, res) {
    try {
        const { guildId } = req.params;
        const { items } = req.body; 
        const botToken = process.env.DISCORD_BOT_TOKEN;

        await axios.patch(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            items,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        return ApiResponse.success(res, null, 'Channels reordered');
    } catch (error) {
        logger.error('Reorder channels error:', error.response?.data || error.message);
        return ApiResponse.error(res, 'Failed to reorder channels', error.response?.data, 500);
    }
}

async function cloneChannel(req, res) {
    try {
        const { guildId, channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const sourceRes = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        const source = sourceRes.data;

        const payload = {
            name: `${source.name}-copy`,
            type: source.type,
            topic: source.topic,
            bitrate: source.bitrate,
            user_limit: source.user_limit,
            rate_limit_per_user: source.rate_limit_per_user,
            position: source.position,
            permission_overwrites: source.permission_overwrites,
            parent_id: source.parent_id,
            nsfw: source.nsfw
        };

        const response = await axios.post(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            payload,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        return ApiResponse.success(res, response.data, 'Channel cloned');
    } catch (error) {
        logger.error('Clone channel error:', error.message);
        return ApiResponse.error(res, 'Failed to clone channel', null, 500);
    }
}

async function syncChannelPermissions(req, res) {
    try {
        const { guildId, channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const channelRes = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        const channel = channelRes.data;

        if (!channel.parent_id) {
            return ApiResponse.error(res, 'Channel has no category to sync with', null, 400);
        }

        const categoryRes = await axios.get(
            `https://discord.com/api/v10/channels/${channel.parent_id}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        const category = categoryRes.data;

        await axios.patch(
            `https://discord.com/api/v10/channels/${channelId}`,
            { permission_overwrites: category.permission_overwrites },
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        return ApiResponse.success(res, null, 'Permissions synced');
    } catch (error) {
        logger.error('Sync permissions error:', error.message);
        return ApiResponse.error(res, 'Failed to sync permissions', null, 500);
    }
}

async function archiveChannel(req, res) {
    try {
        const { guildId, channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const channelRes = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        const channel = channelRes.data;
        const overwrites = channel.permission_overwrites || [];

        const everyoneRole = overwrites.find(o => o.id === guildId);
        if (everyoneRole) {
            everyoneRole.deny = (BigInt(everyoneRole.deny) | 2048n).toString();
        } else {
            overwrites.push({
                id: guildId,
                type: 0,
                allow: '0',
                deny: '2048' 
            });
        }

        await axios.patch(
            `https://discord.com/api/v10/channels/${channelId}`,
            { 
                permission_overwrites: overwrites,
                name: `archived-${channel.name}`
            },
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        return ApiResponse.success(res, null, 'Channel archived');
    } catch (error) {
        logger.error('Archive channel error:', error.message);
        return ApiResponse.error(res, 'Failed to archive channel', null, 500);
    }
}

async function bulkDeleteChannels(req, res) {
    try {
        const { channelIds } = req.body;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!Array.isArray(channelIds)) return ApiResponse.error(res, 'Invalid data');

        for (const id of channelIds) {
            try {
                await axios.delete(
                    `https://discord.com/api/v10/channels/${id}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
            } catch (e) { logger.warn(`Failed to delete channel ${id}: ${e.message}`); }
        }

        return ApiResponse.success(res, null, 'Channels deleted');
    } catch (error) {
        return ApiResponse.error(res, 'Bulk delete failed', null, 500);
    }
}

async function getChannelWebhooks(req, res) {
    try {
        const { channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const response = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/webhooks`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        return ApiResponse.success(res, response.data);
    } catch (error) {
        return ApiResponse.error(res, 'Failed to fetch webhooks', null, 500);
    }
}

async function createWebhook(req, res) {
    try {
        const { channelId } = req.params;
        const { name } = req.body;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const response = await axios.post(
            `https://discord.com/api/v10/channels/${channelId}/webhooks`,
            { name },
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        return ApiResponse.success(res, response.data);
    } catch (error) {
        return ApiResponse.error(res, 'Failed to create webhook', null, 500);
    }
}

async function deleteWebhook(req, res) {
    try {
        const { webhookId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        await axios.delete(
            `https://discord.com/api/v10/webhooks/${webhookId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        return ApiResponse.success(res, null);
    } catch (error) {
        return ApiResponse.error(res, 'Failed to delete webhook', null, 500);
    }
}

async function getPinnedMessages(req, res) {
    try {
        const { channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const response = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/pins`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        return ApiResponse.success(res, response.data);
    } catch (error) {
        return ApiResponse.error(res, 'Failed to fetch pins', null, 500);
    }
}

async function unpinMessage(req, res) {
    try {
        const { channelId, messageId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        await axios.delete(
            `https://discord.com/api/v10/channels/${channelId}/pins/${messageId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        return ApiResponse.success(res, null);
    } catch (error) {
        return ApiResponse.error(res, 'Failed to unpin message', null, 500);
    }
}

async function ensureBackupDir(guildId) {
    const guildBackupDir = path.join(BACKUPS_DIR, guildId);
    try {
        await fs.mkdir(guildBackupDir, { recursive: true });
    } catch (e) {
        // Directory exists
    }
    return guildBackupDir;
}

async function createBackup(req, res) {
    try {
        const { guildId } = req.params;
        const { name } = req.body || {};
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const [channelsRes, rolesRes, guildRes] = await Promise.all([
            axios.get(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers: { Authorization: `Bot ${botToken}` } }),
            axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${botToken}` } }),
            axios.get(`https://discord.com/api/v10/guilds/${guildId}`, { headers: { Authorization: `Bot ${botToken}` } })
        ]);

        const timestamp = new Date().toISOString();
        const backupId = `backup_${Date.now()}`;
        const backupName = name || `Backup ${new Date().toLocaleString()}`;

        const backup = {
            id: backupId,
            name: backupName,
            timestamp,
            guildId,
            guildName: guildRes.data.name,
            roles: rolesRes.data,
            channels: channelsRes.data,
            channelCount: channelsRes.data.length,
            roleCount: rolesRes.data.length
        };

        // Save to server
        const guildBackupDir = await ensureBackupDir(guildId);
        const filePath = path.join(guildBackupDir, `${backupId}.json`);
        await fs.writeFile(filePath, JSON.stringify(backup, null, 2));

        return ApiResponse.success(res, {
            id: backupId,
            name: backupName,
            timestamp,
            channelCount: backup.channelCount,
            roleCount: backup.roleCount
        });
    } catch (error) {
        logger.error('Backup error:', error.message);
        return ApiResponse.error(res, 'Failed to create backup', null, 500);
    }
}

async function listBackups(req, res) {
    try {
        const { guildId } = req.params;
        const guildBackupDir = path.join(BACKUPS_DIR, guildId);

        let files = [];
        try {
            files = await fs.readdir(guildBackupDir);
        } catch (e) {
            // No backups yet
            return ApiResponse.success(res, []);
        }

        const backups = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const filePath = path.join(guildBackupDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const backup = JSON.parse(content);
                backups.push({
                    id: backup.id,
                    name: backup.name,
                    timestamp: backup.timestamp,
                    channelCount: backup.channelCount || backup.channels?.length || 0,
                    roleCount: backup.roleCount || backup.roles?.length || 0
                });
            } catch (e) {
                logger.warn(`Failed to read backup file ${file}`);
            }
        }

        // Sort by timestamp descending
        backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return ApiResponse.success(res, backups);
    } catch (error) {
        logger.error('List backups error:', error.message);
        return ApiResponse.error(res, 'Failed to list backups', null, 500);
    }
}

async function getBackup(req, res) {
    try {
        const { guildId, backupId } = req.params;
        const filePath = path.join(BACKUPS_DIR, guildId, `${backupId}.json`);

        const content = await fs.readFile(filePath, 'utf-8');
        const backup = JSON.parse(content);

        return ApiResponse.success(res, backup);
    } catch (error) {
        logger.error('Get backup error:', error.message);
        return ApiResponse.error(res, 'Backup not found', null, 404);
    }
}

async function deleteBackup(req, res) {
    try {
        const { guildId, backupId } = req.params;
        const filePath = path.join(BACKUPS_DIR, guildId, `${backupId}.json`);

        await fs.unlink(filePath);

        return ApiResponse.success(res, { message: 'Backup deleted' });
    } catch (error) {
        logger.error('Delete backup error:', error.message);
        return ApiResponse.error(res, 'Failed to delete backup', null, 500);
    }
}

async function restoreBackup(req, res) {
    const { guildId } = req.params;
    const { backupId } = req.body;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Helper function for delay (rate limiting)
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    logger.info(`[Restore] Starting backup restore for guild ${guildId}, backupId: ${backupId}`);

    // Load backup from server
    let backup;
    try {
        if (backupId) {
            const filePath = path.join(BACKUPS_DIR, guildId, `${backupId}.json`);
            logger.info(`[Restore] Loading backup from: ${filePath}`);
            const content = await fs.readFile(filePath, 'utf-8');
            backup = JSON.parse(content);
            logger.info(`[Restore] Backup loaded: ${backup.channels?.length || 0} channels, ${backup.roles?.length || 0} roles`);
        } else {
            return ApiResponse.error(res, 'Backup ID required', null, 400);
        }

        if (!backup || !backup.roles || !backup.channels) {
            logger.error('[Restore] Invalid backup data - missing roles or channels');
            return ApiResponse.error(res, 'Invalid backup data', null, 400);
        }
    } catch (error) {
        logger.error('[Restore] Failed to load backup:', error.message);
        return ApiResponse.error(res, 'Failed to load backup file', null, 500);
    }

    // Send immediate response - restore will continue in background
    res.json({ success: true, message: 'Backup restore started. This may take a few moments.' });

    // Continue restore process in background
    (async () => {
        try {
            // Get bot's highest role position for comparison
            let botHighestPosition = 0;
            try {
                // First get the bot's user ID
                const botUserRes = await axios.get(
                    `https://discord.com/api/v10/users/@me`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                const botUserId = botUserRes.data.id;

                // Then get the bot's member info
                const botMemberRes = await axios.get(
                    `https://discord.com/api/v10/guilds/${guildId}/members/${botUserId}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                const botRoles = botMemberRes.data?.roles || [];

                const rolesRes = await axios.get(
                    `https://discord.com/api/v10/guilds/${guildId}/roles`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                const allRoles = rolesRes.data;

                for (const roleId of botRoles) {
                    const role = allRoles.find(r => r.id === roleId);
                    if (role && role.position > botHighestPosition) {
                        botHighestPosition = role.position;
                    }
                }
                logger.info(`[Restore] Bot's highest role position: ${botHighestPosition}`);
            } catch (e) {
                logger.warn('[Restore] Could not determine bot role position:', e.response?.data || e.message);
            }

            // Step 1: Delete existing channels
            logger.info('[Restore] Fetching existing channels to delete...');
            let existingChannels = [];
            try {
                const channelsRes = await axios.get(
                    `https://discord.com/api/v10/guilds/${guildId}/channels`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                existingChannels = channelsRes.data;
                logger.info(`[Restore] Found ${existingChannels.length} existing channels`);
            } catch (e) {
                logger.error('[Restore] Failed to fetch existing channels:', e.message);
            }

            // Delete channels (non-categories first, then categories)
            const existingNonCategories = existingChannels.filter(c => c.type !== 4);
            const existingCategories = existingChannels.filter(c => c.type === 4);

            for (const channel of existingNonCategories) {
                try {
                    await axios.delete(
                        `https://discord.com/api/v10/channels/${channel.id}`,
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    logger.info(`[Restore] Deleted channel: ${channel.name}`);
                    await delay(300); // Rate limit prevention
                } catch (e) {
                    logger.warn(`[Restore] Failed to delete channel ${channel.name}: ${e.response?.data?.message || e.message}`);
                }
            }

            for (const category of existingCategories) {
                try {
                    await axios.delete(
                        `https://discord.com/api/v10/channels/${category.id}`,
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    logger.info(`[Restore] Deleted category: ${category.name}`);
                    await delay(300);
                } catch (e) {
                    logger.warn(`[Restore] Failed to delete category ${category.name}: ${e.response?.data?.message || e.message}`);
                }
            }

            // Step 2: Delete existing roles (except @everyone, managed, and roles above bot)
            logger.info('[Restore] Fetching existing roles to delete...');
            let existingRoles = [];
            try {
                const rolesRes = await axios.get(
                    `https://discord.com/api/v10/guilds/${guildId}/roles`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                existingRoles = rolesRes.data;
                logger.info(`[Restore] Found ${existingRoles.length} existing roles`);
            } catch (e) {
                logger.error('[Restore] Failed to fetch existing roles:', e.message);
            }

            // Sort roles by position (lowest first) to delete safely
            existingRoles.sort((a, b) => a.position - b.position);

            for (const role of existingRoles) {
                if (role.name === '@everyone' || role.managed) {
                    logger.info(`[Restore] Skipping role ${role.name} (${role.managed ? 'managed' : '@everyone'})`);
                    continue;
                }
                if (role.position >= botHighestPosition) {
                    logger.info(`[Restore] Skipping role ${role.name} (position ${role.position} >= bot position ${botHighestPosition})`);
                    continue;
                }
                try {
                    await axios.delete(
                        `https://discord.com/api/v10/guilds/${guildId}/roles/${role.id}`,
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    logger.info(`[Restore] Deleted role: ${role.name}`);
                    await delay(300);
                } catch (e) {
                    logger.warn(`[Restore] Failed to delete role ${role.name}: ${e.response?.data?.message || e.message}`);
                }
            }

            // Step 3: Create roles from backup
            logger.info('[Restore] Creating roles from backup...');
            const roleMap = {};

            for (const role of backup.roles) {
                if (role.name === '@everyone' || role.managed) continue;
                try {
                    const newRole = await axios.post(
                        `https://discord.com/api/v10/guilds/${guildId}/roles`,
                        {
                            name: role.name,
                            permissions: role.permissions,
                            color: role.color,
                            hoist: role.hoist,
                            mentionable: role.mentionable
                        },
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    roleMap[role.id] = newRole.data.id;
                    logger.info(`[Restore] Created role: ${role.name} (${role.id} -> ${newRole.data.id})`);
                    await delay(300);
                } catch (e) {
                    logger.warn(`[Restore] Failed to restore role ${role.name}: ${e.response?.data?.message || e.message}`);
                }
            }

            // Step 4: Create categories first
            logger.info('[Restore] Creating categories from backup...');
            const categoryMap = {};
            const categories = backup.channels.filter(c => c.type === 4);
            const others = backup.channels.filter(c => c.type !== 4);

            for (const cat of categories) {
                try {
                    const catData = {
                        name: cat.name,
                        type: 4
                    };

                    // Only add permission_overwrites if not empty
                    if (cat.permission_overwrites && cat.permission_overwrites.length > 0) {
                        catData.permission_overwrites = cat.permission_overwrites.map(p => ({
                            id: roleMap[p.id] || p.id,
                            type: p.type,
                            allow: p.allow,
                            deny: p.deny
                        }));
                    }

                    const newCat = await axios.post(
                        `https://discord.com/api/v10/guilds/${guildId}/channels`,
                        catData,
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    categoryMap[cat.id] = newCat.data.id;
                    logger.info(`[Restore] Created category: ${cat.name} (${cat.id} -> ${newCat.data.id})`);
                    await delay(300);
                } catch (e) {
                    logger.warn(`[Restore] Failed to restore category ${cat.name}: ${e.response?.data?.message || e.message}`);
                    if (e.response?.data) {
                        logger.warn(`[Restore] Discord API response: ${JSON.stringify(e.response.data)}`);
                    }
                }
            }

            // Step 5: Create channels
            logger.info('[Restore] Creating channels from backup...');
            for (const channel of others) {
                try {
                    const channelData = {
                        name: channel.name,
                        type: channel.type
                    };

                    // Only add permission_overwrites if not empty
                    if (channel.permission_overwrites && channel.permission_overwrites.length > 0) {
                        channelData.permission_overwrites = channel.permission_overwrites.map(p => ({
                            id: roleMap[p.id] || p.id,
                            type: p.type,
                            allow: p.allow,
                            deny: p.deny
                        }));
                    }

                    // Add optional fields if they exist
                    if (channel.topic) channelData.topic = channel.topic;
                    if (channel.nsfw === true) channelData.nsfw = true;
                    if (channel.bitrate && channel.type === 2) channelData.bitrate = channel.bitrate;
                    if (channel.user_limit && channel.type === 2) channelData.user_limit = channel.user_limit;
                    if (channel.rate_limit_per_user) channelData.rate_limit_per_user = channel.rate_limit_per_user;
                    if (channel.parent_id && categoryMap[channel.parent_id]) {
                        channelData.parent_id = categoryMap[channel.parent_id];
                    }

                    await axios.post(
                        `https://discord.com/api/v10/guilds/${guildId}/channels`,
                        channelData,
                        { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    logger.info(`[Restore] Created channel: ${channel.name} (type: ${channel.type})`);
                    await delay(300);
                } catch (e) {
                    logger.warn(`[Restore] Failed to restore channel ${channel.name}: ${e.response?.data?.message || e.message}`);
                    if (e.response?.data) {
                        logger.warn(`[Restore] Discord API response: ${JSON.stringify(e.response.data)}`);
                    }
                }
            }

            logger.info(`[Restore] Backup restore completed for guild ${guildId}`);
        } catch (error) {
            logger.error('[Restore] Fatal error in background restore:', error.message, error.stack);
        }
    })();
}

async function getGuildRoles(req, res) {
    try {
      const { guildId } = req.params;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );

      // Get bot's highest role position
      let botHighestPosition = 0;
      let botRoleIds = [];
      try {
          // First get the bot's user ID
          const botUserRes = await axios.get(
              `https://discord.com/api/v10/users/@me`,
              { headers: { Authorization: `Bot ${botToken}` } }
          );
          const botUserId = botUserRes.data.id;
          logger.info(`[Roles] Bot user ID: ${botUserId}`);

          // Then get the bot's member info in this guild
          const botMemberRes = await axios.get(
              `https://discord.com/api/v10/guilds/${guildId}/members/${botUserId}`,
              { headers: { Authorization: `Bot ${botToken}` } }
          );
          botRoleIds = botMemberRes.data?.roles || [];
          logger.info(`[Roles] Bot has ${botRoleIds.length} roles in guild ${guildId}: ${JSON.stringify(botRoleIds)}`);

          for (const roleId of botRoleIds) {
              const role = response.data.find(r => r.id === roleId);
              if (role) {
                  logger.info(`[Roles] Bot role: ${role.name} at position ${role.position}`);
                  if (role.position > botHighestPosition) {
                      botHighestPosition = role.position;
                  }
              }
          }
          logger.info(`[Roles] Bot highest position: ${botHighestPosition}`);
      } catch (e) {
          logger.error('Could not determine bot role position:', e.response?.data || e.message);
      }

      const roles = response.data
        .map(role => {
            // Bot can manage a role if:
            // 1. Bot's highest role is above this role (position comparison)
            // 2. Role is not managed (integration/bot role)
            // 3. Role is not @everyone
            const canManage = botHighestPosition > 0 &&
                              role.position < botHighestPosition &&
                              !role.managed &&
                              role.name !== '@everyone';

            return {
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                permissions: role.permissions,
                hoist: role.hoist,
                mentionable: role.mentionable,
                managed: role.managed,
                icon: role.icon,
                unicode_emoji: role.unicode_emoji,
                tags: role.tags,
                canManage
            };
        })
        .sort((a, b) => b.position - a.position);

      return ApiResponse.success(res, { roles, botHighestPosition });
    } catch (error) {
      logger.error('Get guild roles error:', error);
      return ApiResponse.error(res, 'Failed to fetch roles', null, 500);
    }
}

async function createRole(req, res) {
    try {
        const { guildId } = req.params;
        const { name, color, hoist, mentionable, permissions } = req.body;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const roleData = {
            name: name || 'new role',
            color: color || 0,
            hoist: hoist || false,
            mentionable: mentionable || false
        };

        if (permissions) {
            roleData.permissions = permissions;
        }

        const response = await axios.post(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            roleData,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        logger.info(`[Roles] Created role: ${response.data.name} in guild ${guildId}`);
        return ApiResponse.success(res, response.data, 'Role created successfully');
    } catch (error) {
        logger.error('Create role error:', error.response?.data || error.message);
        return ApiResponse.error(res, error.response?.data?.message || 'Failed to create role', null, 500);
    }
}

async function updateRole(req, res) {
    try {
        const { guildId, roleId } = req.params;
        const { name, color, hoist, mentionable, permissions } = req.body;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const roleData = {};
        if (name !== undefined) roleData.name = name;
        if (color !== undefined) roleData.color = color;
        if (hoist !== undefined) roleData.hoist = hoist;
        if (mentionable !== undefined) roleData.mentionable = mentionable;
        if (permissions !== undefined) roleData.permissions = permissions;

        const response = await axios.patch(
            `https://discord.com/api/v10/guilds/${guildId}/roles/${roleId}`,
            roleData,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        logger.info(`[Roles] Updated role: ${response.data.name} in guild ${guildId}`);
        return ApiResponse.success(res, response.data, 'Role updated successfully');
    } catch (error) {
        logger.error('Update role error:', error.response?.data || error.message);
        return ApiResponse.error(res, error.response?.data?.message || 'Failed to update role', null, 500);
    }
}

async function deleteRole(req, res) {
    try {
        const { guildId, roleId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        await axios.delete(
            `https://discord.com/api/v10/guilds/${guildId}/roles/${roleId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        logger.info(`[Roles] Deleted role ${roleId} in guild ${guildId}`);
        return ApiResponse.success(res, null, 'Role deleted successfully');
    } catch (error) {
        logger.error('Delete role error:', error.response?.data || error.message);
        return ApiResponse.error(res, error.response?.data?.message || 'Failed to delete role', null, 500);
    }
}

async function cloneRole(req, res) {
    try {
        const { guildId, roleId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        // Get the original role
        const rolesRes = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        const originalRole = rolesRes.data.find(r => r.id === roleId);
        if (!originalRole) {
            return ApiResponse.error(res, 'Role not found', null, 404);
        }

        // Create a clone
        const response = await axios.post(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            {
                name: `${originalRole.name} (Copy)`,
                color: originalRole.color,
                hoist: originalRole.hoist,
                mentionable: originalRole.mentionable,
                permissions: originalRole.permissions
            },
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        logger.info(`[Roles] Cloned role: ${originalRole.name} -> ${response.data.name} in guild ${guildId}`);
        return ApiResponse.success(res, response.data, 'Role cloned successfully');
    } catch (error) {
        logger.error('Clone role error:', error.response?.data || error.message);
        return ApiResponse.error(res, error.response?.data?.message || 'Failed to clone role', null, 500);
    }
}

async function bulkDeleteRoles(req, res) {
    try {
        const { guildId } = req.params;
        const { roleIds } = req.body;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
            return ApiResponse.error(res, 'Role IDs required', null, 400);
        }

        const results = { deleted: [], failed: [] };

        for (const roleId of roleIds) {
            try {
                await axios.delete(
                    `https://discord.com/api/v10/guilds/${guildId}/roles/${roleId}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                results.deleted.push(roleId);
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
            } catch (e) {
                results.failed.push({ id: roleId, error: e.response?.data?.message || e.message });
            }
        }

        logger.info(`[Roles] Bulk delete: ${results.deleted.length} deleted, ${results.failed.length} failed in guild ${guildId}`);
        return ApiResponse.success(res, results, `Deleted ${results.deleted.length} roles`);
    } catch (error) {
        logger.error('Bulk delete roles error:', error.message);
        return ApiResponse.error(res, 'Failed to bulk delete roles', null, 500);
    }
}

async function reorderRoles(req, res) {
    try {
        const { guildId } = req.params;
        const { positions } = req.body; // Array of { id, position }
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!positions || !Array.isArray(positions)) {
            return ApiResponse.error(res, 'Positions array required', null, 400);
        }

        const response = await axios.patch(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            positions,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        logger.info(`[Roles] Reordered roles in guild ${guildId}`);
        return ApiResponse.success(res, response.data, 'Roles reordered successfully');
    } catch (error) {
        logger.error('Reorder roles error:', error.response?.data || error.message);
        return ApiResponse.error(res, error.response?.data?.message || 'Failed to reorder roles', null, 500);
    }
}

async function getGuildEmojis(req, res) {
    try {
        const { guildId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const response = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/emojis`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        const emojis = response.data.map(emoji => ({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`,
            formatted: emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`
        }));

        return ApiResponse.success(res, emojis);
    } catch (error) {
        logger.error('Get guild emojis error:', error.message);
        return ApiResponse.error(res, 'Failed to fetch emojis', null, 500);
    }
}

async function fetchChannelMessage(req, res) {
    try {
        const { channelId, messageId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const response = await axios.get(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        const msg = response.data;

        return ApiResponse.success(res, {
            id: msg.id,
            channelId: msg.channel_id,
            content: msg.content || '',
            embeds: (msg.embeds || []).map(embed => ({
                title: embed.title || '',
                description: embed.description || '',
                url: embed.url || '',
                color: embed.color != null ? `#${embed.color.toString(16).padStart(6, '0')}` : '',
                author: embed.author ? {
                    name: embed.author.name || '',
                    iconUrl: embed.author.icon_url || '',
                    url: embed.author.url || ''
                } : null,
                thumbnail: embed.thumbnail ? { url: embed.thumbnail.url || '' } : null,
                image: embed.image ? { url: embed.image.url || '' } : null,
                fields: (embed.fields || []).map(f => ({
                    name: f.name || '',
                    value: f.value || '',
                    inline: f.inline || false
                })),
                footer: embed.footer ? {
                    text: embed.footer.text || '',
                    iconUrl: embed.footer.icon_url || ''
                } : null,
                timestamp: embed.timestamp || null
            })),
            components: msg.components || [],
            attachments: (msg.attachments || []).map(a => ({
                id: a.id,
                filename: a.filename,
                url: a.url,
                proxyUrl: a.proxy_url,
                contentType: a.content_type,
                size: a.size
            }))
        });
    } catch (error) {
        logger.error('Fetch message error:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            return ApiResponse.error(res, 'Message not found', null, 404);
        }
        return ApiResponse.error(res, 'Failed to fetch message', error.response?.data, 500);
    }
}

async function sendEmbedMessage(req, res) {
    try {
        const { guildId } = req.params;
        const {
            channelId,
            embed,
            messageId,
            sections,
            baseImage,
            useEmbed = true,
            imageOptions = {},
            components = [],
            content = ''
        } = req.body;

        if (!channelId) return ApiResponse.error(res, 'Channel ID is required');

        const botToken = process.env.DISCORD_BOT_TOKEN;

        // Build Discord embed object from our format
        const buildDiscordEmbed = (embedData) => {
            if (!embedData) return null;

            const discordEmbed = {};

            if (embedData.title) discordEmbed.title = embedData.title;
            if (embedData.url || embedData.titleUrl) discordEmbed.url = embedData.url || embedData.titleUrl;
            if (embedData.description) discordEmbed.description = embedData.description;
            if (embedData.color) {
                // Handle hex color string or number
                if (typeof embedData.color === 'string') {
                    discordEmbed.color = parseInt(embedData.color.replace('#', ''), 16);
                } else {
                    discordEmbed.color = embedData.color;
                }
            }

            // Author
            if (embedData.author && embedData.author.name) {
                discordEmbed.author = {
                    name: embedData.author.name
                };
                if (embedData.author.iconUrl || embedData.author.icon_url) {
                    discordEmbed.author.icon_url = embedData.author.iconUrl || embedData.author.icon_url;
                }
                if (embedData.author.url) {
                    discordEmbed.author.url = embedData.author.url;
                }
            }

            // Thumbnail
            if (embedData.thumbnail) {
                if (typeof embedData.thumbnail === 'string') {
                    discordEmbed.thumbnail = { url: embedData.thumbnail };
                } else if (embedData.thumbnail.url) {
                    discordEmbed.thumbnail = { url: embedData.thumbnail.url };
                }
            }

            // Image
            if (embedData.image) {
                if (typeof embedData.image === 'string') {
                    discordEmbed.image = { url: embedData.image };
                } else if (embedData.image.url) {
                    discordEmbed.image = { url: embedData.image.url };
                }
            }

            // Fields
            if (embedData.fields && Array.isArray(embedData.fields) && embedData.fields.length > 0) {
                discordEmbed.fields = embedData.fields.map(field => ({
                    name: field.name || '\u200b',
                    value: field.value || '\u200b',
                    inline: field.inline || false
                }));
            }

            // Footer
            if (embedData.footer) {
                if (typeof embedData.footer === 'string') {
                    discordEmbed.footer = { text: embedData.footer };
                } else if (embedData.footer.text) {
                    discordEmbed.footer = { text: embedData.footer.text };
                    if (embedData.footer.iconUrl || embedData.footer.icon_url) {
                        discordEmbed.footer.icon_url = embedData.footer.iconUrl || embedData.footer.icon_url;
                    }
                }
            }

            // Timestamp
            if (embedData.timestamp) {
                discordEmbed.timestamp = new Date().toISOString();
            }

            return discordEmbed;
        };

        // Build Discord components (buttons) from our format
        const buildDiscordComponents = (buttons) => {
            if (!buttons || !Array.isArray(buttons) || buttons.length === 0) return [];

            const BUTTON_STYLE_MAP = {
                'PRIMARY': 1,
                'SECONDARY': 2,
                'SUCCESS': 3,
                'DANGER': 4,
                'LINK': 5
            };

            const discordComponents = [];
            let currentRow = { type: 1, components: [] };

            for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                const button = {
                    type: 2,
                    style: BUTTON_STYLE_MAP[btn.style] || 1,
                    label: btn.label || 'Button'
                };

                if (btn.emoji) {
                    // Handle emoji - could be unicode or custom
                    const customMatch = btn.emoji.match(/^<a?:(\w+):(\d+)>$/);
                    if (customMatch) {
                        button.emoji = { name: customMatch[1], id: customMatch[2] };
                    } else {
                        button.emoji = { name: btn.emoji };
                    }
                }

                if (btn.style === 'LINK' && btn.url) {
                    button.url = btn.url;
                } else {
                    button.custom_id = btn.customId || `btn_${Date.now()}_${i}`;
                }

                currentRow.components.push(button);

                // Discord allows max 5 buttons per row
                if (currentRow.components.length === 5 || i === buttons.length - 1) {
                    discordComponents.push(currentRow);
                    currentRow = { type: 1, components: [] };
                }

                // Discord allows max 5 rows
                if (discordComponents.length >= 5) break;
            }

            return discordComponents;
        };

        if (sections && Array.isArray(sections) && sections.length > 0) {
            const formData = new FormData();
            const embedsToSend = [];
            let combinedContent = '';

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const fileName = `section-${i}.png`;
                const imageBuffer = await generateSectionImage(baseImage, section.titleText || '', imageOptions);
                formData.append(`files[${i}]`, imageBuffer, fileName);

                if (useEmbed) {
                    const imageEmbed = {
                        image: { url: `attachment://${fileName}` },
                        color: embed?.color ? (typeof embed.color === 'string' ? parseInt(embed.color.replace('#', ''), 16) : embed.color) : 0x3b82f6
                    };
                    let textEmbed = null;
                    if (section.content) {
                        textEmbed = {
                            description: section.content,
                            color: embed?.color ? (typeof embed.color === 'string' ? parseInt(embed.color.replace('#', ''), 16) : embed.color) : 0x3b82f6
                        };
                    }
                    if (i === sections.length - 1 && embed?.footer) {
                        const footerObj = typeof embed.footer === 'string' ? { text: embed.footer } : embed.footer;
                        if (textEmbed) textEmbed.footer = footerObj;
                        else imageEmbed.footer = footerObj;
                    }
                    embedsToSend.push(imageEmbed);
                    if (textEmbed) embedsToSend.push(textEmbed);
                } else {
                    if (section.content) combinedContent += section.content + '\n\n';
                }
            }

            if (useEmbed && embedsToSend.length > 10) return ApiResponse.error(res, 'Too many sections. Discord limits messages to 10 embeds.');

            const payload = {};
            if (useEmbed) payload.embeds = embedsToSend;
            else payload.content = combinedContent.trim();

            // Add components if provided
            const discordComponents = buildDiscordComponents(components);
            if (discordComponents.length > 0) {
                payload.components = discordComponents;
            }

            formData.append('payload_json', JSON.stringify(payload));

            const url = `https://discord.com/api/v10/channels/${channelId}/messages${messageId ? `/${messageId}` : ''}`;
            const method = messageId ? 'patch' : 'post';

            await axios[method](
                url,
                formData,
                { headers: { Authorization: `Bot ${botToken}`, ...formData.getHeaders() } }
            );

            return ApiResponse.success(res, null, 'Message sent successfully');

        } else {
            // Check if we have file uploads
            const hasFileUploads = embed && (embed.thumbnailFile || embed.imageFile);

            if (hasFileUploads) {
                // Use FormData for file uploads
                const formData = new FormData();
                const attachments = [];
                let fileIndex = 0;

                // Process thumbnail file
                if (embed.thumbnailFile) {
                    const base64Data = embed.thumbnailFile.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = embed.thumbnailFileName || 'thumbnail.png';
                    formData.append(`files[${fileIndex}]`, buffer, fileName);
                    embed.thumbnail = { url: `attachment://${fileName}` };
                    attachments.push({ id: fileIndex, filename: fileName });
                    fileIndex++;
                    delete embed.thumbnailFile;
                    delete embed.thumbnailFileName;
                }

                // Process image file
                if (embed.imageFile) {
                    const base64Data = embed.imageFile.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = embed.imageFileName || 'image.png';
                    formData.append(`files[${fileIndex}]`, buffer, fileName);
                    embed.image = { url: `attachment://${fileName}` };
                    attachments.push({ id: fileIndex, filename: fileName });
                    fileIndex++;
                    delete embed.imageFile;
                    delete embed.imageFileName;
                }

                const payload = {};

                if (content) {
                    payload.content = content;
                }

                if (embed && useEmbed) {
                    const discordEmbed = buildDiscordEmbed(embed);
                    if (discordEmbed && Object.keys(discordEmbed).length > 0) {
                        payload.embeds = [discordEmbed];
                    }
                }

                const discordComponents = buildDiscordComponents(components);
                if (discordComponents.length > 0) {
                    payload.components = discordComponents;
                }

                if (attachments.length > 0) {
                    payload.attachments = attachments;
                }

                formData.append('payload_json', JSON.stringify(payload));

                const url = `https://discord.com/api/v10/channels/${channelId}/messages${messageId ? `/${messageId}` : ''}`;
                const method = messageId ? 'patch' : 'post';

                await axios[method](
                    url,
                    formData,
                    { headers: { Authorization: `Bot ${botToken}`, ...formData.getHeaders() } }
                );

                return ApiResponse.success(res, null, 'Message sent successfully');
            } else {
                // Standard embed message without file uploads
                const payload = {};

                // Add content if provided
                if (content) {
                    payload.content = content;
                }

                // Build and add embed
                if (embed && useEmbed) {
                    const discordEmbed = buildDiscordEmbed(embed);
                    if (discordEmbed && Object.keys(discordEmbed).length > 0) {
                        payload.embeds = [discordEmbed];
                    }
                }

                // Add components if provided
                const discordComponents = buildDiscordComponents(components);
                if (discordComponents.length > 0) {
                    payload.components = discordComponents;
                }

                // Ensure we have something to send
                if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
                    return ApiResponse.error(res, 'Message must have content or embed');
                }

                const url = `https://discord.com/api/v10/channels/${channelId}/messages${messageId ? `/${messageId}` : ''}`;
                const method = messageId ? 'patch' : 'post';

                await axios[method](
                    url,
                    payload,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                return ApiResponse.success(res, null, 'Message sent successfully');
            }
        }

    } catch (error) {
        logger.error('Send/Edit embed error:', error.response?.data || error.message);
        return ApiResponse.error(res, 'Failed to send/edit message', error.response?.data, 500);
    }
}

const BUTTON_STYLES = { 'Primary': 1, 'Secondary': 2, 'Success': 3, 'Danger': 4 };

async function createReactionRolePanel(req, res) {
    try {
        const { guildId } = req.params;
        const {
            channelId, embed, roles, mode, messageId, interactionType = 'reaction',
            panelId, panelMode = 'normal', maxRoles = 1,
            requiredRoles = [], forbiddenRoles = [],
            minAccountAge = 0, minServerTime = 0,
            dmNotification = false, dmMessage = '', logChannel = ''
        } = req.body;

        const botToken = process.env.DISCORD_BOT_TOKEN;
        const guild = await models.Guild.findOne({ where: { guildId } });
        if (!guild) return ApiResponse.error(res, 'Guild not found in database.', null, 404);

        const currentSettings = guild.settings || {};
        const reactionRoles = currentSettings.reactionRoles || [];

        // Handle toggle enable/disable
        if (mode === 'toggle') {
            const panelIndex = reactionRoles.findIndex(p => p.id === panelId);
            if (panelIndex === -1) return ApiResponse.error(res, 'Panel not found', null, 404);

            reactionRoles[panelIndex].enabled = req.body.enabled;
            guild.set('settings', { ...currentSettings, reactionRoles });
            guild.changed('settings', true);
            await guild.save();

            return ApiResponse.success(res, {}, `Panel ${req.body.enabled ? 'enabled' : 'disabled'}`);
        }

        // Handle update existing panel
        if (mode === 'update' && panelId) {
            const panelIndex = reactionRoles.findIndex(p => p.id === panelId);
            if (panelIndex === -1) return ApiResponse.error(res, 'Panel not found', null, 404);

            const existingPanel = reactionRoles[panelIndex];

            // Update embed message and components if provided
            if (embed) {
                try {
                    // For button panels, also update buttons
                    if (existingPanel.interactionType === 'button') {
                        const components = [];
                        let currentRow = { type: 1, components: [] };

                        for (let i = 0; i < roles.length; i++) {
                            const role = roles[i];
                            const button = {
                                type: 2,
                                style: BUTTON_STYLES[role.buttonStyle] || 1,
                                label: role.buttonLabel || 'Role',
                                custom_id: `role_${guildId}_${role.roleId}`
                            };
                            currentRow.components.push(button);
                            if (currentRow.components.length === 5 || i === roles.length - 1) {
                                components.push(currentRow);
                                currentRow = { type: 1, components: [] };
                            }
                            if (components.length >= 5) break;
                        }

                        await axios.patch(
                            `https://discord.com/api/v10/channels/${existingPanel.channelId}/messages/${existingPanel.messageId}`,
                            { embeds: [embed], components: components },
                            { headers: { Authorization: `Bot ${botToken}` } }
                        );
                    } else {
                        // For reaction panels, just update embed
                        await axios.patch(
                            `https://discord.com/api/v10/channels/${existingPanel.channelId}/messages/${existingPanel.messageId}`,
                            { embeds: [embed] },
                            { headers: { Authorization: `Bot ${botToken}` } }
                        );
                    }
                } catch (err) {
                    logger.warn('Failed to update message:', err.response?.data || err.message);
                }
            }

            // For reaction panels, update reactions if roles changed
            if (existingPanel.interactionType === 'reaction') {
                try {
                    // Get current reactions
                    const oldEmojis = existingPanel.roles.map(r => r.emoji || r.originalEmoji);
                    const newEmojis = roles.map(r => r.emoji);

                    // Remove old reactions that are no longer needed
                    for (const oldEmoji of oldEmojis) {
                        if (!newEmojis.includes(oldEmoji)) {
                            try {
                                const customEmojiMatch = oldEmoji.match(/^<a?:(\w+):(\d+)>$/);
                                let encodedEmoji;
                                if (customEmojiMatch) {
                                    const emojiId = customEmojiMatch[2];
                                    encodedEmoji = `${customEmojiMatch[1]}:${emojiId}`;
                                } else {
                                    encodedEmoji = encodeURIComponent(oldEmoji.replace(/\uFE0F/g, ''));
                                }
                                await axios.delete(
                                    `https://discord.com/api/v10/channels/${existingPanel.channelId}/messages/${existingPanel.messageId}/reactions/${encodedEmoji}`,
                                    { headers: { Authorization: `Bot ${botToken}` } }
                                );
                            } catch (err) {
                                logger.debug('Failed to remove old reaction:', oldEmoji);
                            }
                        }
                    }

                    // Add new reactions
                    for (const role of roles) {
                        if (!oldEmojis.includes(role.emoji)) {
                            try {
                                const emoji = role.emoji.trim();
                                const customEmojiMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
                                let encodedEmoji;
                                if (customEmojiMatch) {
                                    const emojiId = customEmojiMatch[2];
                                    encodedEmoji = `${customEmojiMatch[1]}:${emojiId}`;
                                } else {
                                    encodedEmoji = encodeURIComponent(emoji.replace(/\uFE0F/g, ''));
                                }
                                await axios.put(
                                    `https://discord.com/api/v10/channels/${existingPanel.channelId}/messages/${existingPanel.messageId}/reactions/${encodedEmoji}/@me`,
                                    {},
                                    { headers: { Authorization: `Bot ${botToken}` } }
                                );
                            } catch (err) {
                                logger.debug('Failed to add new reaction:', role.emoji);
                            }
                        }
                    }
                } catch (err) {
                    logger.warn('Failed to update reactions:', err);
                }
            }

            // Prepare roles with extended data
            const updatedRoles = roles.map(r => ({
                roleId: r.roleId,
                emoji: r.emoji,
                originalEmoji: r.originalEmoji || r.emoji,
                buttonLabel: r.buttonLabel,
                buttonStyle: r.buttonStyle,
                description: r.description || '',
                tempDurationSeconds: r.tempDurationSeconds || 0
            }));

            // Update panel settings
            reactionRoles[panelIndex] = {
                ...existingPanel,
                title: embed?.title || existingPanel.title,
                description: embed?.description || existingPanel.description,
                color: embed?.color ? `#${embed.color.toString(16).padStart(6, '0')}` : existingPanel.color,
                panelMode,
                maxRoles: panelMode === 'limited' ? maxRoles : null,
                requiredRoles,
                forbiddenRoles,
                minAccountAge,
                minServerTime,
                dmNotification,
                dmMessage,
                logChannel,
                roles: updatedRoles
            };

            guild.set('settings', { ...currentSettings, reactionRoles });
            guild.changed('settings', true);
            await guild.save();

            return ApiResponse.success(res, { messageId: existingPanel.messageId }, 'Panel updated successfully');
        }

        // Validation for new panels
        if (!channelId || !roles || roles.length === 0) return ApiResponse.error(res, 'Invalid data');

        let finalMessageId = messageId;
        const isButtonMode = interactionType === 'button';

        // Build panel settings object
        const panelSettings = {
            panelMode,
            maxRoles: panelMode === 'limited' ? maxRoles : null,
            requiredRoles,
            forbiddenRoles,
            minAccountAge,
            minServerTime,
            dmNotification,
            dmMessage,
            logChannel,
            enabled: true
        };

        if (isButtonMode) {
            if (!embed) return ApiResponse.error(res, 'Embed data required for button panel');
            const components = [];
            let currentRow = { type: 1, components: [] };

            for (let i = 0; i < roles.length; i++) {
                const role = roles[i];
                const button = {
                    type: 2,
                    style: BUTTON_STYLES[role.buttonStyle] || 1,
                    label: role.buttonLabel || 'Role',
                    custom_id: `role_${guildId}_${role.roleId}`
                };
                currentRow.components.push(button);
                if (currentRow.components.length === 5 || i === roles.length - 1) {
                    components.push(currentRow);
                    currentRow = { type: 1, components: [] };
                }
                if (components.length >= 5) break;
            }

            const messageResponse = await axios.post(
                `https://discord.com/api/v10/channels/${channelId}/messages`,
                { embeds: [embed], components: components },
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            finalMessageId = messageResponse.data.id;

            const successfulRoles = roles.slice(0, 25).map(r => ({
                roleId: r.roleId,
                buttonLabel: r.buttonLabel,
                buttonStyle: r.buttonStyle,
                description: r.description || '',
                tempDurationSeconds: r.tempDurationSeconds || 0
            }));

            reactionRoles.push({
                id: Date.now().toString(),
                messageId: finalMessageId,
                channelId,
                interactionType: 'button',
                title: embed?.title,
                description: embed?.description,
                color: embed?.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#9333ea',
                roles: successfulRoles,
                ...panelSettings
            });

            guild.set('settings', { ...currentSettings, reactionRoles });
            guild.changed('settings', true);
            await guild.save();

            return ApiResponse.success(res, { messageId: finalMessageId }, 'Button Role Panel created successfully');
        }

        if (mode === 'new') {
             if (!embed) return ApiResponse.error(res, 'Embed data required for new message');
             const messageResponse = await axios.post(
                `https://discord.com/api/v10/channels/${channelId}/messages`,
                { embeds: [embed] },
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            finalMessageId = messageResponse.data.id;
        } else {
            try {
                await axios.get(
                    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
            } catch (err) { return ApiResponse.error(res, 'Message not found. Please check Channel and Message ID.'); }
        }

        const failedEmojis = [];
        const successfulRoles = [];

        for (const role of roles) {
            try {
                const emoji = role.emoji.trim();
                const customEmojiMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
                let encodedEmoji, storedEmoji;

                if (customEmojiMatch) {
                    const emojiId = customEmojiMatch[2];
                    encodedEmoji = `${customEmojiMatch[1]}:${emojiId}`;
                    storedEmoji = emojiId;
                } else {
                    encodedEmoji = encodeURIComponent(emoji.replace(/\uFE0F/g, ''));
                    storedEmoji = emoji.replace(/\uFE0F/g, '');
                }

                await axios.put(
                    `https://discord.com/api/v10/channels/${channelId}/messages/${finalMessageId}/reactions/${encodedEmoji}/@me`,
                    {},
                    { headers: { Authorization: `Bot ${botToken}` } }
                );

                successfulRoles.push({
                    emoji: storedEmoji,
                    originalEmoji: emoji,
                    roleId: role.roleId,
                    description: role.description || '',
                    tempDurationSeconds: role.tempDurationSeconds || 0
                });
            } catch (err) { failedEmojis.push(role.emoji); }
        }

        if (successfulRoles.length === 0) return ApiResponse.error(res, `Failed to add any reactions. Check emoji format.`, { failedEmojis }, 400);

        reactionRoles.push({
            id: Date.now().toString(),
            messageId: finalMessageId,
            channelId,
            interactionType: 'reaction',
            title: embed?.title,
            description: embed?.description,
            color: embed?.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#9333ea',
            roles: successfulRoles,
            ...panelSettings
        });

        guild.set('settings', { ...currentSettings, reactionRoles });
        guild.changed('settings', true);
        await guild.save();

        const message = failedEmojis.length > 0 ? `Panel created. Failed emojis: ${failedEmojis.join(', ')}` : 'Reaction Role Panel configured successfully';
        return ApiResponse.success(res, { messageId: finalMessageId, failedEmojis }, message);

    } catch (error) {
        logger.error('Create role panel error:', error.response?.data || error.message);
        return ApiResponse.error(res, 'Failed to create panel', error.response?.data, 500);
    }
}

async function createStatsChannels(req, res) {
    try {
        const { guildId } = req.params;
        const {
            categoryName = '📊 Statystyki',
            channelNames = {},
            enabledChannels = ['members', 'boosts', 'online', 'bots', 'roles', 'channels'],
            refreshInterval = 10,
            memberGoal = 1000
        } = req.body;

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return ApiResponse.error(res, 'Bot configuration error', null, 500);

        const defaultNames = {
            members: 'Członkowie: {count}',
            humans: 'Ludzie: {count}',
            boosts: 'Boosty: {count}',
            boostLevel: 'Boost: {level}',
            online: 'Online: {count}',
            bots: 'Boty: {count}',
            roles: 'Role: {count}',
            channels: 'Kanały: {count}',
            textChannels: 'Tekstowe: {count}',
            voiceChannels: 'Głosowe: {count}',
            categories: 'Kategorie: {count}',
            voiceActive: 'Na voice: {count}',
            emojis: 'Emoji: {count}',
            stickers: 'Naklejki: {count}',
            goal: '{count}/{goal} członków',
            date: '📅 {date}',
            time: '🕐 {time}'
        };
        const finalNames = { ...defaultNames, ...channelNames };

        const categoryResponse = await axios.post(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            { name: categoryName, type: 4, permission_overwrites: [{ id: guildId, type: 0, deny: '1048576' }] },
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        const categoryId = categoryResponse.data.id;
        const createdChannels = {};
        const channelTypes = [
            { key: 'members', placeholder: '0' },
            { key: 'humans', placeholder: '0' },
            { key: 'boosts', placeholder: '0' },
            { key: 'boostLevel', placeholder: 'Brak', placeholderKey: 'level' },
            { key: 'online', placeholder: '0' },
            { key: 'bots', placeholder: '0' },
            { key: 'roles', placeholder: '0' },
            { key: 'channels', placeholder: '0' },
            { key: 'textChannels', placeholder: '0' },
            { key: 'voiceChannels', placeholder: '0' },
            { key: 'categories', placeholder: '0' },
            { key: 'voiceActive', placeholder: '0' },
            { key: 'emojis', placeholder: '0' },
            { key: 'stickers', placeholder: '0' },
            { key: 'goal', placeholder: '0', extraPlaceholder: { key: 'goal', value: memberGoal } },
            { key: 'date', placeholder: new Date().toLocaleDateString('pl-PL'), placeholderKey: 'date' },
            { key: 'time', placeholder: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }), placeholderKey: 'time' }
        ];

        for (const channelType of channelTypes) {
            if (!enabledChannels.includes(channelType.key)) continue;

            let channelName = finalNames[channelType.key];
            const placeholderKey = channelType.placeholderKey || 'count';
            channelName = channelName.replace(`{${placeholderKey}}`, channelType.placeholder);

            // Obsługa dodatkowych placeholderów (np. goal)
            if (channelType.extraPlaceholder) {
                channelName = channelName.replace(`{${channelType.extraPlaceholder.key}}`, channelType.extraPlaceholder.value);
            }

            try {
                const channelResponse = await axios.post(
                    `https://discord.com/api/v10/guilds/${guildId}/channels`,
                    { name: channelName, type: 2, parent_id: categoryId, permission_overwrites: [{ id: guildId, type: 0, deny: '1048576' }] },
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                createdChannels[channelType.key] = channelResponse.data.id;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (channelError) { logger.error(`Failed to create ${channelType.key} channel:`, channelError.message); }
        }

        const guild = await models.Guild.findOne({ where: { guildId } });
        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        const currentSettings = guild.settings || {};
        await guild.update({
            settings: {
                ...currentSettings,
                statsChannels: {
                    enabled: true,
                    categoryId,
                    categoryName,
                    refreshInterval,
                    memberGoal,
                    channelNames: finalNames,
                    membersChannelId: createdChannels.members || '',
                    humansChannelId: createdChannels.humans || '',
                    boostsChannelId: createdChannels.boosts || '',
                    boostLevelChannelId: createdChannels.boostLevel || '',
                    onlineChannelId: createdChannels.online || '',
                    botsChannelId: createdChannels.bots || '',
                    rolesChannelId: createdChannels.roles || '',
                    channelsChannelId: createdChannels.channels || '',
                    textChannelsChannelId: createdChannels.textChannels || '',
                    voiceChannelsChannelId: createdChannels.voiceChannels || '',
                    categoriesChannelId: createdChannels.categories || '',
                    voiceActiveChannelId: createdChannels.voiceActive || '',
                    emojisChannelId: createdChannels.emojis || '',
                    stickersChannelId: createdChannels.stickers || '',
                    goalChannelId: createdChannels.goal || '',
                    dateChannelId: createdChannels.date || '',
                    timeChannelId: createdChannels.time || ''
                }
            }
        });

        return ApiResponse.success(res, { categoryId, createdChannels, message: 'Stats channels created successfully' });
    } catch (error) {
        logger.error('Create stats channels error:', error.response?.data || error.message);
        return ApiResponse.error(res, 'Failed to create stats channels', error.response?.data, 500);
    }
}

async function deleteStatsChannels(req, res) {
    try {
        const { guildId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const guild = await models.Guild.findOne({ where: { guildId } });

        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);
        const statsConfig = guild.settings?.statsChannels;
        const customStatsChannels = guild.settings?.customStatsChannels || [];

        if ((!statsConfig || !statsConfig.categoryId) && customStatsChannels.length === 0) {
            return ApiResponse.error(res, 'No stats channels configured', null, 400);
        }

        // Zbierz wszystkie standardowe kanały do usunięcia
        const channelIds = [
            statsConfig?.membersChannelId, statsConfig?.humansChannelId, statsConfig?.boostsChannelId,
            statsConfig?.boostLevelChannelId, statsConfig?.onlineChannelId, statsConfig?.botsChannelId,
            statsConfig?.rolesChannelId, statsConfig?.channelsChannelId, statsConfig?.textChannelsChannelId,
            statsConfig?.voiceChannelsChannelId, statsConfig?.categoriesChannelId, statsConfig?.voiceActiveChannelId,
            statsConfig?.emojisChannelId, statsConfig?.stickersChannelId, statsConfig?.goalChannelId,
            statsConfig?.dateChannelId, statsConfig?.timeChannelId
        ].filter(Boolean);

        // Dodaj custom kanały do listy usuwania
        for (const customChannel of customStatsChannels) {
            if (customChannel.id) channelIds.push(customChannel.id);
        }

        for (const channelId of channelIds) {
            try {
                await axios.delete(`https://discord.com/api/v10/channels/${channelId}`, { headers: { Authorization: `Bot ${botToken}` } });
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) { logger.warn(`Failed to delete channel ${channelId}:`, err.message); }
        }

        // Usuń kategorię
        if (statsConfig?.categoryId) {
            try {
                await axios.delete(`https://discord.com/api/v10/channels/${statsConfig.categoryId}`, { headers: { Authorization: `Bot ${botToken}` } });
            } catch (err) { logger.warn(`Failed to delete category ${statsConfig.categoryId}:`, err.message); }
        }

        const currentSettings = guild.settings || {};
        await guild.update({
            settings: {
                ...currentSettings,
                statsChannels: { enabled: false },
                customStatsChannels: []
            }
        });

        return ApiResponse.success(res, null, 'Stats channels deleted successfully');
    } catch (error) {
        logger.error('Delete stats channels error:', error.message);
        return ApiResponse.error(res, 'Failed to delete stats channels', null, 500);
    }
}

async function deleteReactionRolePanel(req, res) {
    try {
        const { guildId, panelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const botClientId = process.env.DISCORD_CLIENT_ID;
        const guild = await models.Guild.findOne({ where: { guildId } });

        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        const currentSettings = guild.settings || {};
        const reactionRoles = currentSettings.reactionRoles || [];
        const panelIndex = reactionRoles.findIndex(p => p.id === panelId);

        if (panelIndex === -1) return ApiResponse.error(res, 'Panel not found', null, 404);

        const panel = reactionRoles[panelIndex];
        const { channelId, messageId, interactionType, roles } = panel;
        let discordCleanupSuccess = true;
        let cleanupMessage = '';

        try {
            const messageResponse = await axios.get(
                `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            const message = messageResponse.data;
            const isBotMessage = message.author.id === botClientId;

            if (interactionType === 'button' || isBotMessage) {
                await axios.delete(
                    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                cleanupMessage = 'Message deleted from Discord';
            } else {
                for (const role of roles) {
                    try {
                        let encodedEmoji;
                        const emoji = role.emoji;
                        if (/^\d+$/.test(emoji)) encodedEmoji = `placeholder:${emoji}`;
                        else encodedEmoji = encodeURIComponent(emoji);

                        await axios.delete(
                            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
                            { headers: { Authorization: `Bot ${botToken}` } }
                        );
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } catch (reactionError) { logger.warn(`Failed to remove reaction ${role.emoji}:`, reactionError.message); }
                }
                cleanupMessage = 'Bot reactions removed from message';
            }
        } catch (discordError) {
            if (discordError.response?.status === 404) cleanupMessage = 'Message already deleted from Discord';
            else {
                discordCleanupSuccess = false;
                cleanupMessage = 'Failed to cleanup Discord';
            }
        }

        reactionRoles.splice(panelIndex, 1);
        guild.set('settings', { ...currentSettings, reactionRoles });
        guild.changed('settings', true);
        await guild.save();

        return ApiResponse.success(res, { discordCleanupSuccess }, cleanupMessage);
    } catch (error) {
        logger.error('Delete reaction role panel error:', error.message);
        return ApiResponse.error(res, 'Failed to delete panel', null, 500);
    }
}

// ========== CUSTOM STATS CHANNELS ==========
// Dostępne zmienne dla custom stats channels
const AVAILABLE_STATS_VARIABLES = {
    // Członkowie
    '{members}': 'Wszyscy członkowie serwera',
    '{humans}': 'Ludzie (bez botów)',
    '{bots}': 'Boty',
    '{goal}': 'Cel członków (ustawiany w konfiguracji)',
    '{toGoal}': 'Ile brakuje do celu',
    '{goalPercent}': 'Procent do celu',

    // Statusy online
    '{online}': 'Użytkownicy online (wszystkie statusy poza offline)',
    '{offline}': 'Użytkownicy offline',
    '{dnd}': 'Użytkownicy nie przeszkadzać',
    '{idle}': 'Użytkownicy zaraz wracam',
    '{streaming}': 'Użytkownicy streamujący',

    // Aktywność głosowa
    '{voice}': 'Użytkownicy na kanałach głosowych',
    '{voiceMuted}': 'Użytkownicy wyciszeni (mute)',
    '{voiceDeaf}': 'Użytkownicy z wyłączonym dźwiękiem (deaf)',
    '{voiceStreaming}': 'Użytkownicy streamujący na voice',
    '{voiceCamera}': 'Użytkownicy z kamerą',

    // Kanały
    '{channels}': 'Wszystkie kanały',
    '{textChannels}': 'Kanały tekstowe',
    '{voiceChannels}': 'Kanały głosowe',
    '{categories}': 'Kategorie',
    '{threads}': 'Aktywne wątki',
    '{forumChannels}': 'Kanały forum',
    '{stageChannels}': 'Kanały stage',
    '{announcements}': 'Kanały ogłoszeń',

    // Role
    '{roles}': 'Liczba ról',

    // Boosty
    '{boosts}': 'Liczba boostów',
    '{boostLevel}': 'Poziom boost (0-3)',
    '{boostTier}': 'Nazwa poziomu boost',
    '{boosters}': 'Liczba boosterów',

    // Emoji i naklejki
    '{emojis}': 'Liczba emoji',
    '{animatedEmojis}': 'Animowane emoji',
    '{staticEmojis}': 'Statyczne emoji',
    '{stickers}': 'Liczba naklejek',

    // Informacje o serwerze
    '{createdDays}': 'Dni od utworzenia serwera',
    '{createdDate}': 'Data utworzenia serwera',
    '{verificationLevel}': 'Poziom weryfikacji (0-4)',

    // Data i czas
    '{date}': 'Aktualna data',
    '{time}': 'Aktualny czas',
    '{day}': 'Dzień tygodnia',
    '{month}': 'Nazwa miesiąca',
    '{year}': 'Rok'
};

async function getCustomStatsChannels(req, res) {
    try {
        const { guildId } = req.params;
        const guild = await models.Guild.findOne({ where: { guildId } });

        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        const customStats = guild.settings?.customStatsChannels || [];
        const statsConfig = guild.settings?.statsChannels || {};

        return ApiResponse.success(res, {
            channels: customStats,
            categoryId: statsConfig.categoryId || null,
            refreshInterval: statsConfig.refreshInterval || 10,
            memberGoal: statsConfig.memberGoal || 1000,
            availableVariables: AVAILABLE_STATS_VARIABLES
        });
    } catch (error) {
        logger.error('Get custom stats channels error:', error.message);
        return ApiResponse.error(res, 'Failed to get custom stats channels', null, 500);
    }
}

async function createCustomStatsChannel(req, res) {
    try {
        const { guildId } = req.params;
        const { nameTemplate, categoryId: requestedCategoryId } = req.body;

        if (!nameTemplate || typeof nameTemplate !== 'string') {
            return ApiResponse.error(res, 'nameTemplate is required', null, 400);
        }

        // Walidacja - musi zawierać przynajmniej jedną zmienną
        const hasVariable = Object.keys(AVAILABLE_STATS_VARIABLES).some(v => nameTemplate.includes(v));
        if (!hasVariable) {
            return ApiResponse.error(res, 'nameTemplate must contain at least one variable like {members}, {online}, etc.', null, 400);
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return ApiResponse.error(res, 'Bot configuration error', null, 500);

        let guild = await models.Guild.findOne({ where: { guildId } });
        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        let currentSettings = guild.settings || {};
        let categoryId = requestedCategoryId || currentSettings.statsChannels?.categoryId;

        // Jeśli nie ma kategorii, utwórz nową
        if (!categoryId) {
            const categoryResponse = await axios.post(
                `https://discord.com/api/v10/guilds/${guildId}/channels`,
                {
                    name: '📊 Statystyki',
                    type: 4,
                    permission_overwrites: [{ id: guildId, type: 0, deny: '1048576' }]
                },
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            categoryId = categoryResponse.data.id;

            // Zapisz kategorię w statsChannels
            await guild.update({
                settings: {
                    ...currentSettings,
                    statsChannels: {
                        ...(currentSettings.statsChannels || {}),
                        enabled: true,
                        categoryId
                    }
                }
            });
            // Odśwież guild i currentSettings
            await guild.reload();
            currentSettings = guild.settings || {};
        }

        // Utwórz tymczasową nazwę kanału (zastąp zmienne placeholderami)
        const now = new Date();
        const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
        const memberGoal = currentSettings.statsChannels?.memberGoal || 1000;

        const placeholders = {
            '{members}': '0', '{humans}': '0', '{bots}': '0',
            '{goal}': String(memberGoal), '{toGoal}': String(memberGoal), '{goalPercent}': '0',
            '{online}': '0', '{offline}': '0', '{dnd}': '0', '{idle}': '0', '{streaming}': '0',
            '{voice}': '0', '{voiceMuted}': '0', '{voiceDeaf}': '0', '{voiceStreaming}': '0', '{voiceCamera}': '0',
            '{channels}': '0', '{textChannels}': '0', '{voiceChannels}': '0', '{categories}': '0',
            '{threads}': '0', '{forumChannels}': '0', '{stageChannels}': '0', '{announcements}': '0',
            '{roles}': '0',
            '{boosts}': '0', '{boostLevel}': '0', '{boostTier}': 'Brak', '{boosters}': '0',
            '{emojis}': '0', '{animatedEmojis}': '0', '{staticEmojis}': '0', '{stickers}': '0',
            '{createdDays}': '0', '{createdDate}': now.toLocaleDateString('pl-PL'), '{verificationLevel}': '0',
            '{date}': now.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            '{time}': now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            '{day}': dayNames[now.getDay()],
            '{month}': monthNames[now.getMonth()],
            '{year}': String(now.getFullYear())
        };

        let initialName = nameTemplate;
        Object.entries(placeholders).forEach(([variable, value]) => {
            initialName = initialName.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        // Ogranicz długość nazwy kanału (max 100 znaków dla Discord)
        initialName = initialName.substring(0, 100);

        // Utwórz kanał głosowy
        const channelResponse = await axios.post(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            {
                name: initialName,
                type: 2, // Voice channel
                parent_id: categoryId,
                permission_overwrites: [{ id: guildId, type: 0, deny: '1048576' }]
            },
            { headers: { Authorization: `Bot ${botToken}` } }
        );

        const channelId = channelResponse.data.id;

        // Pobierz najnowsze ustawienia przed zapisem
        await guild.reload();
        currentSettings = guild.settings || {};

        // Dodaj do customStatsChannels
        const customStatsChannels = [...(currentSettings.customStatsChannels || [])];
        const newChannel = {
            id: channelId,
            nameTemplate,
            createdAt: new Date().toISOString()
        };
        customStatsChannels.push(newChannel);

        await guild.update({
            settings: {
                ...currentSettings,
                statsChannels: {
                    ...(currentSettings.statsChannels || {}),
                    enabled: true,
                    categoryId
                },
                customStatsChannels
            }
        });

        return ApiResponse.success(res, {
            channel: newChannel,
            categoryId,
            availableVariables: AVAILABLE_STATS_VARIABLES,
            message: 'Custom stats channel created successfully'
        });
    } catch (error) {
        logger.error('Create custom stats channel error:', error.response?.data || error.message);
        return ApiResponse.error(res, 'Failed to create custom stats channel', error.response?.data, 500);
    }
}

async function updateCustomStatsChannel(req, res) {
    try {
        const { guildId, channelId } = req.params;
        const { nameTemplate } = req.body;

        if (!nameTemplate || typeof nameTemplate !== 'string') {
            return ApiResponse.error(res, 'nameTemplate is required', null, 400);
        }

        const hasVariable = Object.keys(AVAILABLE_STATS_VARIABLES).some(v => nameTemplate.includes(v));
        if (!hasVariable) {
            return ApiResponse.error(res, 'nameTemplate must contain at least one variable', null, 400);
        }

        const guild = await models.Guild.findOne({ where: { guildId } });
        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        const currentSettings = guild.settings || {};
        const customStatsChannels = currentSettings.customStatsChannels || [];

        const channelIndex = customStatsChannels.findIndex(c => c.id === channelId);
        if (channelIndex === -1) {
            return ApiResponse.error(res, 'Custom stats channel not found', null, 404);
        }

        customStatsChannels[channelIndex].nameTemplate = nameTemplate;
        customStatsChannels[channelIndex].updatedAt = new Date().toISOString();

        await guild.update({
            settings: {
                ...currentSettings,
                customStatsChannels
            }
        });

        return ApiResponse.success(res, {
            channel: customStatsChannels[channelIndex],
            message: 'Custom stats channel updated successfully'
        });
    } catch (error) {
        logger.error('Update custom stats channel error:', error.message);
        return ApiResponse.error(res, 'Failed to update custom stats channel', null, 500);
    }
}

async function deleteCustomStatsChannel(req, res) {
    try {
        const { guildId, channelId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        const guild = await models.Guild.findOne({ where: { guildId } });
        if (!guild) return ApiResponse.error(res, 'Server not found', null, 404);

        const currentSettings = guild.settings || {};
        const customStatsChannels = currentSettings.customStatsChannels || [];

        const channelIndex = customStatsChannels.findIndex(c => c.id === channelId);
        if (channelIndex === -1) {
            return ApiResponse.error(res, 'Custom stats channel not found', null, 404);
        }

        // Usuń kanał z Discord
        try {
            await axios.delete(
                `https://discord.com/api/v10/channels/${channelId}`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
        } catch (err) {
            logger.warn(`Failed to delete Discord channel ${channelId}:`, err.message);
        }

        // Usuń z listy
        customStatsChannels.splice(channelIndex, 1);

        await guild.update({
            settings: {
                ...currentSettings,
                customStatsChannels
            }
        });

        return ApiResponse.success(res, null, 'Custom stats channel deleted successfully');
    } catch (error) {
        logger.error('Delete custom stats channel error:', error.message);
        return ApiResponse.error(res, 'Failed to delete custom stats channel', null, 500);
    }
}

module.exports = {
  getStats, getServers, getCommandStats, getActivity, getUserGuilds,
  getGuildDetails, updateGuildSettings, getGuildChannels, createChannel,
  updateChannel, deleteChannel, getGuildRoles, getGuildEmojis, fetchChannelMessage, sendEmbedMessage,
  createReactionRolePanel, deleteReactionRolePanel, createStatsChannels,
  deleteStatsChannels, reorderChannels, cloneChannel, syncChannelPermissions,
  archiveChannel, bulkDeleteChannels, getChannelWebhooks, createWebhook,
  deleteWebhook, getPinnedMessages, unpinMessage,
  createBackup, listBackups, getBackup, deleteBackup, restoreBackup,
  createRole, updateRole, deleteRole, cloneRole, bulkDeleteRoles, reorderRoles,
  getCustomStatsChannels, createCustomStatsChannel, updateCustomStatsChannel, deleteCustomStatsChannel
};