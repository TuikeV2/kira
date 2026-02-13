const { models } = require('@kira/shared');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const discordOAuth = require('../utils/discord-oauth');

async function getModerationLogs(req, res) {
  try {
    const { page = 1, limit = 50, guildId, actionType, moderatorId } = req.query;
    const offset = (page - 1) * limit;

    // 1. Weryfikacja bezpieczeństwa: Pobierz serwery użytkownika
    const user = await models.User.findByPk(req.user.userId);
    if (!user || !user.accessToken) {
      return ApiResponse.error(res, 'User authentication failed', null, 401);
    }

    // Pobieramy gildie użytkownika z Discorda, aby sprawdzić uprawnienia
    let discordGuilds;
    try {
        discordGuilds = await discordOAuth.getUserGuilds(user.accessToken);
    } catch (e) {
        logger.error('Failed to fetch user guilds for log verification', e);
        return ApiResponse.error(res, 'Failed to verify guild permissions', null, 500);
    }

    // Filtrujemy tylko te, gdzie użytkownik jest właścicielem lub ma uprawnienia "Manage Guild" (0x20)
    const allowedGuildIds = discordGuilds
        .filter(g => (parseInt(g.permissions) & 0x20) === 0x20 || g.owner)
        .map(g => g.id);

    const where = {};

    // Jeśli użytkownik prosi o konkretny serwer
    if (guildId) {
        if (!allowedGuildIds.includes(guildId)) {
            return ApiResponse.error(res, 'You do not have permission to view logs for this server', null, 403);
        }
        where.guildId = guildId;
    } else {
        // Jeśli nie prosi o konkretny, pokaż logi ze wszystkich JEGO serwerów
        where.guildId = { [Op.in]: allowedGuildIds };
    }

    if (actionType) where.actionType = actionType;
    if (moderatorId) where.moderatorId = moderatorId;

    const { rows: logs, count } = await models.ModerationLog.findAndCountAll({
      where,
      include: [
        { model: models.Guild, as: 'guild', attributes: ['guildName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, logs, page, limit, count);
  } catch (error) {
    logger.error('Get moderation logs error:', error);
    return ApiResponse.error(res, 'Failed to fetch moderation logs', null, 500);
  }
}

async function getWarnings(req, res) {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 50, active = true } = req.query;
    const offset = (page - 1) * limit;

    // Weryfikacja czy użytkownik ma dostęp do tego serwera (uproszczona, idealnie powinna używać middleware)
    const user = await models.User.findByPk(req.user.userId);
    const discordGuilds = await discordOAuth.getUserGuilds(user.accessToken);
    const hasAccess = discordGuilds.some(g => g.id === guildId && ((parseInt(g.permissions) & 0x20) === 0x20 || g.owner));

    if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied', null, 403);
    }

    const where = { guildId };
    if (active !== undefined) where.isActive = active === 'true';

    const { rows: warnings, count } = await models.Warning.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, warnings, page, limit, count);
  } catch (error) {
    logger.error('Get warnings error:', error);
    return ApiResponse.error(res, 'Failed to fetch warnings', null, 500);
  }
}

async function getMutes(req, res) {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 50, active = true } = req.query;
    const offset = (page - 1) * limit;

     // Weryfikacja dostępu
    const user = await models.User.findByPk(req.user.userId);
    const discordGuilds = await discordOAuth.getUserGuilds(user.accessToken);
    const hasAccess = discordGuilds.some(g => g.id === guildId && ((parseInt(g.permissions) & 0x20) === 0x20 || g.owner));

    if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied', null, 403);
    }

    const where = { guildId };
    if (active !== undefined) where.isActive = active === 'true';

    const { rows: mutes, count } = await models.Mute.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['muted_at', 'DESC']]
    });

    return ApiResponse.paginated(res, mutes, page, limit, count);
  } catch (error) {
    logger.error('Get mutes error:', error);
    return ApiResponse.error(res, 'Failed to fetch mutes', null, 500);
  }
}

async function getInviteLogs(req, res) {
  try {
    const { guildId } = req.params;
    const { page = 1, limit = 50, inviterId } = req.query;
    const offset = (page - 1) * limit;

    // Weryfikacja dostępu
    const user = await models.User.findByPk(req.user.userId);
    const discordGuilds = await discordOAuth.getUserGuilds(user.accessToken);
    const hasAccess = discordGuilds.some(g => g.id === guildId && ((parseInt(g.permissions) & 0x20) === 0x20 || g.owner));

    if (!hasAccess) {
      return ApiResponse.error(res, 'Access denied', null, 403);
    }

    const where = { guildId };
    if (inviterId) where.inviterId = inviterId;

    const { rows: inviteLogs, count } = await models.InviteLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['joined_at', 'DESC']]
    });

    return ApiResponse.paginated(res, inviteLogs, page, limit, count);
  } catch (error) {
    logger.error('Get invite logs error:', error);
    return ApiResponse.error(res, 'Failed to fetch invite logs', null, 500);
  }
}

async function getInviteStats(req, res) {
  try {
    const { guildId } = req.params;

    // Weryfikacja dostępu
    const user = await models.User.findByPk(req.user.userId);
    const discordGuilds = await discordOAuth.getUserGuilds(user.accessToken);
    const hasAccess = discordGuilds.some(g => g.id === guildId && ((parseInt(g.permissions) & 0x20) === 0x20 || g.owner));

    if (!hasAccess) {
      return ApiResponse.error(res, 'Access denied', null, 403);
    }

    // Statystyki top inviters
    const topInviters = await models.InviteLog.findAll({
      where: { guildId, inviterId: { [Op.not]: null } },
      attributes: [
        'inviterId',
        'inviterTag',
        [models.InviteLog.sequelize.fn('COUNT', models.InviteLog.sequelize.col('id')), 'inviteCount']
      ],
      group: ['inviterId', 'inviterTag'],
      order: [[models.InviteLog.sequelize.fn('COUNT', models.InviteLog.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    // Statystyki join types
    const joinTypes = await models.InviteLog.findAll({
      where: { guildId },
      attributes: [
        'joinType',
        [models.InviteLog.sequelize.fn('COUNT', models.InviteLog.sequelize.col('id')), 'count']
      ],
      group: ['joinType']
    });

    // Łączna liczba joinów
    const totalJoins = await models.InviteLog.count({ where: { guildId } });

    // Joiny z ostatnich 7 dni
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentJoins = await models.InviteLog.count({
      where: {
        guildId,
        joined_at: { [Op.gte]: sevenDaysAgo }
      }
    });

    return ApiResponse.success(res, {
      topInviters: topInviters.map(i => ({
        inviterId: i.inviterId,
        inviterTag: i.inviterTag,
        inviteCount: parseInt(i.getDataValue('inviteCount'))
      })),
      joinTypes: joinTypes.reduce((acc, jt) => {
        acc[jt.joinType] = parseInt(jt.getDataValue('count'));
        return acc;
      }, {}),
      totalJoins,
      recentJoins
    });
  } catch (error) {
    logger.error('Get invite stats error:', error);
    return ApiResponse.error(res, 'Failed to fetch invite stats', null, 500);
  }
}

module.exports = {
  getModerationLogs,
  getWarnings,
  getMutes,
  getInviteLogs,
  getInviteStats
};