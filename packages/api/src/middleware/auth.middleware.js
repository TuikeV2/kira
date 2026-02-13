const jwt = require('jsonwebtoken');
const config = require('../config/api.config');
const ApiResponse = require('../utils/response');
const { models } = require('@kira/shared');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return ApiResponse.error(res, 'Access token required', null, 401);
  }

  jwt.verify(token, config.jwt.secret, async (err, user) => {
    if (err) {
      return ApiResponse.error(res, 'Invalid or expired token', null, 403);
    }

    // Check if user is banned
    try {
      const dbUser = await models.User.findByPk(user.id, { attributes: ['isBanned', 'banReason'] });
      if (dbUser?.isBanned) {
        return ApiResponse.error(res, dbUser.banReason || 'Your account has been banned', null, 403);
      }
    } catch (e) {
      // If check fails, proceed anyway to not break auth
    }

    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return ApiResponse.error(res, 'Admin access required', null, 403);
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
