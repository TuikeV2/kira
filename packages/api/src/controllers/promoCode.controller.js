const { models } = require('@kira/shared');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

async function getAllPromoCodes(req, res) {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (active !== undefined) where.isActive = active === 'true';

    const { rows: promoCodes, count } = await models.PromoCode.findAndCountAll({
      where,
      include: [
        { model: models.User, as: 'creator', attributes: ['id', 'discordId', 'username'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, promoCodes, page, limit, count);
  } catch (error) {
    logger.error('Get all promo codes error:', error);
    return ApiResponse.error(res, 'Failed to fetch promo codes', null, 500);
  }
}

async function createPromoCode(req, res) {
  try {
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return ApiResponse.error(res, 'Code, discount type and discount value are required');
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return ApiResponse.error(res, 'Invalid discount type. Must be percentage or fixed');
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return ApiResponse.error(res, 'Percentage discount must be between 0 and 100');
    }

    // Check if code already exists
    const existing = await models.PromoCode.findOne({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return ApiResponse.error(res, 'Promo code already exists', null, 409);
    }

    const promoCode = await models.PromoCode.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
      createdByUserId: req.user.userId
    });

    logger.info(`Promo code created: ${promoCode.code} by user ${req.user.discordId}`);

    return ApiResponse.success(res, promoCode, 'Promo code created successfully', 201);
  } catch (error) {
    logger.error('Create promo code error:', error);
    return ApiResponse.error(res, 'Failed to create promo code', null, 500);
  }
}

async function getPromoCodeById(req, res) {
  try {
    const { id } = req.params;

    const promoCode = await models.PromoCode.findByPk(id, {
      include: [
        { model: models.User, as: 'creator', attributes: ['id', 'discordId', 'username'] }
      ]
    });

    if (!promoCode) {
      return ApiResponse.error(res, 'Promo code not found', null, 404);
    }

    return ApiResponse.success(res, promoCode);
  } catch (error) {
    logger.error('Get promo code by ID error:', error);
    return ApiResponse.error(res, 'Failed to fetch promo code', null, 500);
  }
}

async function updatePromoCode(req, res) {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, maxUses, expiresAt, isActive } = req.body;

    const promoCode = await models.PromoCode.findByPk(id);

    if (!promoCode) {
      return ApiResponse.error(res, 'Promo code not found', null, 404);
    }

    const updates = {};
    if (code) updates.code = code.toUpperCase();
    if (discountType) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = discountValue;
    if (maxUses !== undefined) updates.maxUses = maxUses;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updates.isActive = isActive;

    await promoCode.update(updates);

    logger.info(`Promo code updated: ${promoCode.code} by user ${req.user.discordId}`);

    return ApiResponse.success(res, promoCode, 'Promo code updated successfully');
  } catch (error) {
    logger.error('Update promo code error:', error);
    return ApiResponse.error(res, 'Failed to update promo code', null, 500);
  }
}

async function deletePromoCode(req, res) {
  try {
    const { id } = req.params;

    const promoCode = await models.PromoCode.findByPk(id);

    if (!promoCode) {
      return ApiResponse.error(res, 'Promo code not found', null, 404);
    }

    await promoCode.destroy();

    logger.info(`Promo code deleted: ${promoCode.code} by user ${req.user.discordId}`);

    return ApiResponse.success(res, null, 'Promo code deleted successfully');
  } catch (error) {
    logger.error('Delete promo code error:', error);
    return ApiResponse.error(res, 'Failed to delete promo code', null, 500);
  }
}

module.exports = {
  getAllPromoCodes,
  createPromoCode,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode
};
