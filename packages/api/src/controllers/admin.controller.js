const { models, sequelize } = require('@kira/shared');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const { User, License, Guild, CommandUsage, ModerationLog, Warning, Mute, AutoModViolation } = models;

// ============ DASHBOARD ============

async function getAdminDashboard(req, res) {
  try {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const safe = (promise, fallback = 0) => promise.catch(() => fallback);

    const [
      totalUsers,
      totalServers,
      totalLicenses,
      commandsToday,
      totalMutes,
      newUsersThisWeek,
      newUsersPrevWeek,
      serversThisWeek,
      serversPrevWeek,
      licensesThisWeek,
      licensesPrevWeek,
      commandsByDay,
      usersByDay,
      serversByDay,
      automodByType,
      recentActivity
    ] = await Promise.all([
      safe(User.count()),
      safe(Guild.count({ where: { isActive: true } })),
      safe(License.count({ where: { isActive: true } })),
      safe(CommandUsage.count({ where: { executedAt: { [Op.gte]: last24h } } })),
      safe(Mute.count({ where: { isActive: true } })),
      // Trends
      safe(User.count({ where: { createdAt: { [Op.gte]: weekAgo } } })),
      safe(User.count({ where: { createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: weekAgo } } })),
      safe(Guild.count({ where: { isActive: true, joinedAt: { [Op.gte]: weekAgo } } })),
      safe(Guild.count({ where: { isActive: true, joinedAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: weekAgo } } })),
      safe(License.count({ where: { isActive: true, createdAt: { [Op.gte]: weekAgo } } })),
      safe(License.count({ where: { isActive: true, createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: weekAgo } } })),
      // Charts data - last 7 days
      safe(CommandUsage.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('executed_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { executedAt: { [Op.gte]: weekAgo } },
        group: [sequelize.fn('DATE', sequelize.col('executed_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('executed_at')), 'ASC']],
        raw: true
      }), []),
      safe(User.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { createdAt: { [Op.gte]: weekAgo } },
        group: [sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
        raw: true
      }), []),
      safe(Guild.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('joined_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { isActive: true, joinedAt: { [Op.gte]: weekAgo } },
        group: [sequelize.fn('DATE', sequelize.col('joined_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('joined_at')), 'ASC']],
        raw: true
      }), []),
      // Automod violations by type
      safe(AutoModViolation.findAll({
        attributes: [
          'violationType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { createdAt: { [Op.gte]: weekAgo } },
        group: ['violationType'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        raw: true
      }), []),
      // Recent activity feed
      safe(ModerationLog.findAll({
        limit: 20,
        order: [['created_at', 'DESC']],
        include: [{ model: Guild, as: 'guild', attributes: ['guildName'] }]
      }), [])
    ]);

    const calcTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? { direction: 'up', value: '+100%' } : { direction: 'none', value: '0%' };
      const change = ((current - previous) / previous * 100).toFixed(0);
      return {
        direction: current >= previous ? 'up' : 'down',
        value: `${current >= previous ? '+' : ''}${change}%`
      };
    };

    return ApiResponse.success(res, {
      totalUsers,
      totalServers,
      totalLicenses,
      commandsToday,
      totalMutes,
      newUsersThisWeek,
      trends: {
        users: calcTrend(newUsersThisWeek, newUsersPrevWeek),
        servers: calcTrend(serversThisWeek, serversPrevWeek),
        licenses: calcTrend(licensesThisWeek, licensesPrevWeek)
      },
      charts: {
        commandsByDay: commandsByDay.map(r => ({ date: r.date, count: parseInt(r.count) })),
        usersByDay: usersByDay.map(r => ({ date: r.date, count: parseInt(r.count) })),
        serversByDay: serversByDay.map(r => ({ date: r.date, count: parseInt(r.count) })),
        automodByType: automodByType.map(r => ({ type: r.violationType, count: parseInt(r.count) }))
      },
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        actionType: a.actionType,
        moderatorId: a.moderatorId,
        targetId: a.targetId,
        reason: a.reason,
        guildName: a.guild?.guildName || 'Unknown',
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    return ApiResponse.error(res, 'Failed to fetch admin dashboard', null, 500);
  }
}

// ============ USERS ============

async function getUsers(req, res) {
  try {
    const { page = 1, limit = 10, search, role, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { discordId: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role && ['ADMIN', 'USER'].includes(role)) {
      where.role = role;
    }

    const allowedSort = ['created_at', 'last_login', 'username'];
    const sortCol = allowedSort.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['accessToken', 'refreshToken', 'tokenExpiresAt'] },
      include: [{
        model: License,
        as: 'createdLicenses',
        attributes: ['id', 'tier', 'isActive'],
        required: false
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortCol, sortOrder]]
    });

    const users = rows.map(u => ({
      ...u.toJSON(),
      licensesCount: u.createdLicenses?.length || 0
    }));

    return ApiResponse.paginated(res, users, page, limit, count);
  } catch (error) {
    logger.error('Get users error:', error);
    return ApiResponse.error(res, 'Failed to fetch users', null, 500);
  }
}

async function getUserStats(req, res) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, adminCount, newUsersThisMonth] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'ADMIN' } }),
      User.count({ where: { createdAt: { [Op.gte]: monthStart } } })
    ]);

    return ApiResponse.success(res, { totalUsers, adminCount, newUsersThisMonth });
  } catch (error) {
    logger.error('Get user stats error:', error);
    return ApiResponse.error(res, 'Failed to fetch user stats', null, 500);
  }
}

async function getUserDetails(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['accessToken', 'refreshToken', 'tokenExpiresAt'] },
      include: [{
        model: License,
        as: 'createdLicenses',
        attributes: ['id', 'licenseKey', 'tier', 'maxServers', 'isActive', 'expiresAt', 'createdAt'],
        include: [{
          model: Guild,
          as: 'guilds',
          attributes: ['guildId', 'guildName', 'isActive'],
          required: false
        }]
      }]
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', null, 404);
    }

    return ApiResponse.success(res, user);
  } catch (error) {
    logger.error('Get user details error:', error);
    return ApiResponse.error(res, 'Failed to fetch user details', null, 500);
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'USER'].includes(role)) {
      return ApiResponse.error(res, 'Invalid role. Must be ADMIN or USER');
    }

    const user = await User.findByPk(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', null, 404);
    }

    await user.update({ role });

    return ApiResponse.success(res, { id: user.id, role: user.role });
  } catch (error) {
    logger.error('Update user role error:', error);
    return ApiResponse.error(res, 'Failed to update user role', null, 500);
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', null, 404);
    }

    // Cannot delete yourself
    if (user.discordId === req.user.discordId) {
      return ApiResponse.error(res, 'Cannot delete your own account', null, 400);
    }

    await user.destroy();

    return ApiResponse.success(res, { message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    return ApiResponse.error(res, 'Failed to delete user', null, 500);
  }
}

// ============ STATS / ANALYTICS ============

async function getCommandAnalytics(req, res) {
  try {
    const { period = 7 } = req.query;
    const startDate = period === 'all' ? null : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const dateFilter = startDate ? { executedAt: { [Op.gte]: startDate } } : {};

    const [topCommands, totalCommands, successCount, commandsPerDay, activeServers, activeUsers] = await Promise.all([
      CommandUsage.findAll({
        attributes: [
          'commandName',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['commandName'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 15,
        raw: true
      }),
      CommandUsage.count({ where: dateFilter }),
      CommandUsage.count({ where: { ...dateFilter, success: true } }),
      CommandUsage.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('executed_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: [sequelize.fn('DATE', sequelize.col('executed_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('executed_at')), 'ASC']],
        raw: true
      }),
      CommandUsage.findAll({
        attributes: [
          'guildId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['guildId'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      }),
      CommandUsage.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['userId'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      })
    ]);

    const successRate = totalCommands > 0 ? ((successCount / totalCommands) * 100).toFixed(1) : 0;

    return ApiResponse.success(res, {
      topCommands: topCommands.map(c => ({ name: c.commandName, count: parseInt(c.count) })),
      totalCommands,
      successRate: parseFloat(successRate),
      commandsPerDay: commandsPerDay.map(r => ({ date: r.date, count: parseInt(r.count) })),
      activeServers: activeServers.map(s => ({ guildId: s.guildId, count: parseInt(s.count) })),
      activeUsers: activeUsers.map(u => ({ userId: u.userId, count: parseInt(u.count) }))
    });
  } catch (error) {
    logger.error('Get command analytics error:', error);
    return ApiResponse.error(res, 'Failed to fetch command analytics', null, 500);
  }
}

async function getAutomodAnalytics(req, res) {
  try {
    const { period = 7 } = req.query;
    const startDate = period === 'all' ? null : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const dateFilter = startDate ? { createdAt: { [Op.gte]: startDate } } : {};

    const [violationsByType, recentViolations] = await Promise.all([
      AutoModViolation.findAll({
        attributes: [
          'violationType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['violationType'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        raw: true
      }),
      AutoModViolation.findAll({
        where: dateFilter,
        order: [['created_at', 'DESC']],
        limit: 50,
        raw: true
      })
    ]);

    return ApiResponse.success(res, {
      violationsByType: violationsByType.map(v => ({ type: v.violationType, count: parseInt(v.count) })),
      recentViolations: recentViolations.map(v => ({
        id: v.id,
        guildId: v.guildId || v.guild_id,
        userId: v.userId || v.user_id,
        violationType: v.violationType || v.violation_type,
        actionTaken: v.actionTaken || v.action_taken,
        contentSnippet: v.contentSnippet || v.content_snippet,
        createdAt: v.createdAt || v.created_at
      }))
    });
  } catch (error) {
    logger.error('Get automod analytics error:', error);
    return ApiResponse.error(res, 'Failed to fetch automod analytics', null, 500);
  }
}

async function getModerationAnalytics(req, res) {
  try {
    const { period = 7 } = req.query;
    const startDate = period === 'all' ? null : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const dateFilterWarning = startDate ? { createdAt: { [Op.gte]: startDate } } : {};
    const dateFilterMute = startDate ? { mutedAt: { [Op.gte]: startDate } } : {};
    const dateFilterLog = startDate ? { createdAt: { [Op.gte]: startDate } } : {};

    const [
      warningsCount,
      activeWarnings,
      mutesCount,
      activeMutes,
      actionsByType,
      topModerators,
      perServer
    ] = await Promise.all([
      Warning.count({ where: dateFilterWarning }),
      Warning.count({ where: { isActive: true } }),
      Mute.count({ where: dateFilterMute }),
      Mute.count({ where: { isActive: true } }),
      ModerationLog.findAll({
        attributes: [
          'actionType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilterLog,
        group: ['actionType'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        raw: true
      }),
      ModerationLog.findAll({
        attributes: [
          'moderatorId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilterLog,
        group: ['moderatorId'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      }),
      ModerationLog.findAll({
        attributes: [
          'guildId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: dateFilterLog,
        group: ['guildId'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      })
    ]);

    return ApiResponse.success(res, {
      warningsCount,
      activeWarnings,
      mutesCount,
      activeMutes,
      actionsByType: actionsByType.map(a => ({ type: a.actionType, count: parseInt(a.count) })),
      topModerators: topModerators.map(m => ({ moderatorId: m.moderatorId, count: parseInt(m.count) })),
      perServer: perServer.map(s => ({ guildId: s.guildId, count: parseInt(s.count) }))
    });
  } catch (error) {
    logger.error('Get moderation analytics error:', error);
    return ApiResponse.error(res, 'Failed to fetch moderation analytics', null, 500);
  }
}

module.exports = {
  getAdminDashboard,
  getUsers,
  getUserStats,
  getUserDetails,
  updateUserRole,
  deleteUser,
  getCommandAnalytics,
  getAutomodAnalytics,
  getModerationAnalytics
};
