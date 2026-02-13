const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { models } = require('@kira/shared');
const axios = require('axios');
const config = require('../config/api.config');
const adminController = require('../controllers/admin.controller');

const { Guild, Product } = models;

const ADMIN_IDS = ['1067767295373475941'];

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!ADMIN_IDS.includes(req.user.discordId)) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// ============ DASHBOARD ============
router.get('/dashboard', authenticateToken, requireAdmin, adminController.getAdminDashboard);

// ============ USERS MANAGEMENT ============
router.get('/users/stats', authenticateToken, requireAdmin, adminController.getUserStats);
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers);
router.get('/users/:id', authenticateToken, requireAdmin, adminController.getUserDetails);
router.put('/users/:id/role', authenticateToken, requireAdmin, adminController.updateUserRole);
router.delete('/users/:id', authenticateToken, requireAdmin, adminController.deleteUser);

// Bulk ban users
router.post('/users/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }

    // Limit batch size for safety
    if (userIds.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 users per request' });
    }

    // Prevent banning yourself
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot ban yourself' });
    }

    const { User } = models;

    const [updatedCount] = await User.update(
      { isBanned: true, banReason: reason || null },
      { where: { id: userIds } }
    );

    res.json({
      success: true,
      message: `${updatedCount} users banned`,
      bannedCount: updatedCount
    });
  } catch (error) {
    console.error('Failed to ban users:', error);
    res.status(500).json({ success: false, message: 'Failed to ban users' });
  }
});

// Bulk unban users
router.post('/users/unban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }

    if (userIds.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 users per request' });
    }

    const { User } = models;

    const [updatedCount] = await User.update(
      { isBanned: false, banReason: null },
      { where: { id: userIds } }
    );

    res.json({
      success: true,
      message: `${updatedCount} users unbanned`,
      unbannedCount: updatedCount
    });
  } catch (error) {
    console.error('Failed to unban users:', error);
    res.status(500).json({ success: false, message: 'Failed to unban users' });
  }
});

// ============ ANALYTICS ============
router.get('/stats/commands', authenticateToken, requireAdmin, adminController.getCommandAnalytics);
router.get('/stats/automod', authenticateToken, requireAdmin, adminController.getAutomodAnalytics);
router.get('/stats/moderation', authenticateToken, requireAdmin, adminController.getModerationAnalytics);

// ============ SERVERS ============
// Get all servers where bot is present
router.get('/servers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get guilds from database
    const dbGuilds = await Guild.findAll({
      attributes: ['guildId', 'settings'],
      raw: true
    });

    const servers = [];
    const botToken = config.discordBotToken;

    if (!botToken) {
      // No bot token - return basic data from database
      for (const dbGuild of dbGuilds) {
        const settings = typeof dbGuild.settings === 'string' ? JSON.parse(dbGuild.settings) : dbGuild.settings;
        servers.push({
          id: dbGuild.guildId,
          name: settings?.name || 'Unknown',
          icon: settings?.icon || null,
          memberCount: settings?.memberCount || null,
          ownerId: settings?.ownerId || null,
          channels: settings?.channelCount || null
        });
      }
    } else {
      // Fetch live data from Discord API for each guild
      for (const dbGuild of dbGuilds) {
        const settings = typeof dbGuild.settings === 'string' ? JSON.parse(dbGuild.settings) : dbGuild.settings;

        try {
          // Get guild details with counts
          const guildResponse = await axios.get(
            `https://discord.com/api/v10/guilds/${dbGuild.guildId}?with_counts=true`,
            {
              headers: { Authorization: `Bot ${botToken}` },
              timeout: 5000
            }
          );

          const guild = guildResponse.data;
          servers.push({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.approximate_member_count || 0,
            ownerId: guild.owner_id,
            channels: guild.approximate_presence_count ? `${guild.approximate_presence_count} online` : null
          });
        } catch (e) {
          // If Discord API fails, use database data
          servers.push({
            id: dbGuild.guildId,
            name: settings?.name || 'Unknown',
            icon: settings?.icon || null,
            memberCount: settings?.memberCount || null,
            ownerId: settings?.ownerId || null,
            channels: settings?.channelCount || null
          });
        }
      }
    }

    // Calculate total members
    const totalMembers = servers.reduce((sum, s) => sum + (s.memberCount || 0), 0);

    res.json({
      success: true,
      data: servers,
      total: servers.length,
      totalMembers
    });
  } catch (error) {
    console.error('Failed to fetch admin servers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch servers' });
  }
});

// ============ PRODUCTS MANAGEMENT ============

// Get all products (admin)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// Create product
router.post('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      tier,
      duration,
      price,
      pricePerMonth,
      maxServers,
      features,
      isPopular,
      savings,
      savingsType,
      isActive,
      sortOrder
    } = req.body;

    const product = await Product.create({
      name,
      description,
      tier: tier || 'VIP',
      duration: duration || 1,
      price,
      pricePerMonth: pricePerMonth || (price / duration),
      maxServers: maxServers || 1,
      features: features || [],
      isPopular: isPopular || false,
      savings,
      savingsType: savingsType || 'fixed',
      isActive: isActive !== false,
      sortOrder: sortOrder || 0
    });

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Update product
router.put('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = { ...req.body };

    // Auto-calculate pricePerMonth if not provided
    if (updateData.price && updateData.duration && !updateData.pricePerMonth) {
      updateData.pricePerMonth = updateData.price / updateData.duration;
    }

    await product.update(updateData);
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// Reorder products
router.put('/products/reorder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sortOrder }

    for (const item of items) {
      await Product.update({ sortOrder: item.sortOrder }, { where: { id: item.id } });
    }

    res.json({ success: true, message: 'Products reordered' });
  } catch (error) {
    console.error('Failed to reorder products:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder products' });
  }
});

module.exports = router;
