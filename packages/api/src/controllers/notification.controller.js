const { models } = require('@kira/shared');
const ApiResponse = require('../utils/response');
const { Op } = require('sequelize');

const notificationController = {
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly } = req.query;
      const offset = (page - 1) * limit;

      const where = { userId };
      if (unreadOnly === 'true') {
        where.isRead = false;
      }

      const { count, rows } = await models.Notification.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      return ApiResponse.paginated(res, rows, page, limit, count);
    } catch (error) {
      return ApiResponse.error(res, 'Failed to fetch notifications', null, 500);
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await models.Notification.count({
        where: { userId: req.user.id, isRead: false }
      });
      return ApiResponse.success(res, { count });
    } catch (error) {
      return ApiResponse.error(res, 'Failed to get unread count', null, 500);
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await models.Notification.findOne({
        where: { id, userId: req.user.id }
      });

      if (!notification) {
        return ApiResponse.error(res, 'Notification not found', null, 404);
      }

      await notification.update({ isRead: true, readAt: new Date() });
      return ApiResponse.success(res, notification);
    } catch (error) {
      return ApiResponse.error(res, 'Failed to mark as read', null, 500);
    }
  },

  async markAllAsRead(req, res) {
    try {
      await models.Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId: req.user.id, isRead: false } }
      );
      return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (error) {
      return ApiResponse.error(res, 'Failed to mark all as read', null, 500);
    }
  },

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const deleted = await models.Notification.destroy({
        where: { id, userId: req.user.id }
      });

      if (!deleted) {
        return ApiResponse.error(res, 'Notification not found', null, 404);
      }

      return ApiResponse.success(res, null, 'Notification deleted');
    } catch (error) {
      return ApiResponse.error(res, 'Failed to delete notification', null, 500);
    }
  },

  async clearAll(req, res) {
    try {
      await models.Notification.destroy({
        where: { userId: req.user.id }
      });
      return ApiResponse.success(res, null, 'All notifications cleared');
    } catch (error) {
      return ApiResponse.error(res, 'Failed to clear notifications', null, 500);
    }
  }
};

module.exports = notificationController;
