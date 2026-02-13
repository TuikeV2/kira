const { models, utils, constants } = require('@kira/shared');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Fallback pricing plans (used if no products in database)
const FALLBACK_PLANS = {
  monthly: { id: 'monthly', name: '1 Miesiąc', duration: 1, price: 3000, tier: 'VIP', maxServers: 1 },
  semiannual: { id: 'semiannual', name: '6 Miesięcy', duration: 6, price: 17500, tier: 'VIP', maxServers: 1 },
  annual: { id: 'annual', name: '12 Miesięcy', duration: 12, price: 34000, tier: 'VIP', maxServers: 1 }
};

// Get available pricing plans (from database)
async function getPlans(req, res) {
  try {
    // Try to get products from database
    let products = [];

    if (models.Product) {
      products = await models.Product.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC'], ['price', 'ASC']]
      });
    }

    // If no products in database, use fallback
    if (products.length === 0) {
      const plans = Object.values(FALLBACK_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        duration: plan.duration,
        price: plan.price / 100,
        pricePerMonth: Math.round((plan.price / plan.duration) / 100 * 100) / 100,
        tier: plan.tier,
        maxServers: plan.maxServers,
        isPopular: false,
        savings: null,
        features: []
      }));
      return ApiResponse.success(res, plans);
    }

    // Return products from database
    const plans = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      duration: p.duration,
      price: parseFloat(p.price),
      pricePerMonth: parseFloat(p.pricePerMonth) || Math.round((parseFloat(p.price) / p.duration) * 100) / 100,
      tier: p.tier,
      maxServers: p.maxServers,
      isPopular: p.isPopular,
      savings: p.savings,
      savingsType: p.savingsType,
      features: p.features || []
    }));

    return ApiResponse.success(res, plans);
  } catch (error) {
    logger.error('Get plans error:', error);
    return ApiResponse.error(res, 'Failed to fetch plans', null, 500);
  }
}

// Validate promo code
async function validatePromoCode(req, res) {
  try {
    const { code } = req.body;

    if (!code) {
      return ApiResponse.error(res, 'Promo code is required');
    }

    // Check if promo code exists in database
    const promoCode = await models.PromoCode?.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true
      }
    });

    if (!promoCode) {
      return ApiResponse.error(res, 'Nieprawidłowy kod rabatowy', null, 404);
    }

    // Check if promo code has expired
    if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
      return ApiResponse.error(res, 'Kod rabatowy wygasł', null, 400);
    }

    // Check usage limit
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return ApiResponse.error(res, 'Kod rabatowy został już wykorzystany maksymalną liczbę razy', null, 400);
    }

    return ApiResponse.success(res, {
      code: promoCode.code,
      type: promoCode.discountType, // 'percentage' or 'fixed'
      value: promoCode.discountValue
    });
  } catch (error) {
    logger.error('Validate promo code error:', error);
    return ApiResponse.error(res, 'Failed to validate promo code', null, 500);
  }
}

// Create Stripe checkout session
async function createCheckout(req, res) {
  try {
    const { planId, promoCode } = req.body;

    if (!planId) {
      return ApiResponse.error(res, 'Plan ID is required');
    }

    // Try to get product from database first
    let plan = null;

    if (models.Product) {
      plan = await models.Product.findByPk(planId);
    }

    // Fallback to hardcoded plans
    if (!plan) {
      plan = FALLBACK_PLANS[planId];
      if (plan) {
        plan = { ...plan, price: plan.price / 100 }; // Convert from grosze
      }
    }

    if (!plan) {
      return ApiResponse.error(res, 'Invalid plan ID', null, 400);
    }

    // Calculate price with promo discount (price in PLN, convert to grosze for Stripe)
    let priceInPLN = parseFloat(plan.price);
    let finalPrice = Math.round(priceInPLN * 100); // Convert to grosze

    if (promoCode) {
      const promoCodeRecord = await models.PromoCode?.findOne({
        where: {
          code: promoCode.toUpperCase(),
          isActive: true
        }
      });

      if (promoCodeRecord) {
        if (promoCodeRecord.discountType === 'percentage') {
          finalPrice = Math.round(finalPrice * (1 - promoCodeRecord.discountValue / 100));
        } else if (promoCodeRecord.discountType === 'fixed') {
          finalPrice = Math.max(0, finalPrice - (promoCodeRecord.discountValue * 100));
        }
      }
    }

    const tier = plan.tier || 'VIP';
    const duration = plan.duration || 1;
    const maxServers = plan.maxServers || 1;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik'],
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: `KiraEvo ${tier} - ${plan.name}`,
              description: `Licencja ${tier} na ${duration} ${duration === 1 ? 'miesiąc' : 'miesięcy'}`
            },
            unit_amount: finalPrice
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/buy?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/buy?canceled=true`,
      metadata: {
        userId: req.user.userId.toString(),
        discordId: req.user.discordId,
        planId: planId,
        duration: duration.toString(),
        tier: tier,
        maxServers: maxServers.toString(),
        promoCode: promoCode || ''
      },
      customer_email: req.user.email || undefined,
      locale: 'pl'
    });

    logger.info(`Checkout session created: ${session.id} for user ${req.user.discordId}`);

    return ApiResponse.success(res, {
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    logger.error('Create checkout error:', error);
    return ApiResponse.error(res, 'Failed to create checkout session', null, 500);
  }
}

// Verify payment and get session details
async function verifyPayment(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return ApiResponse.error(res, 'Session ID is required');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return ApiResponse.error(res, 'Payment not completed', null, 400);
    }

    // Check if license was already created for this session
    let license = await models.License.findOne({
      where: {
        metadata: {
          stripeSessionId: sessionId
        }
      },
      include: [
        { model: models.Guild, as: 'guilds', required: false }
      ]
    });

    // If no license yet (webhook may be delayed), create it now
    if (!license) {
      logger.info(`License not found for session ${sessionId}, creating now...`);
      license = await handleSuccessfulPayment(session);

      // Reload with associations
      if (license) {
        license = await models.License.findByPk(license.id, {
          include: [{ model: models.Guild, as: 'guilds', required: false }]
        });
      }
    }

    if (license) {
      return ApiResponse.success(res, {
        status: 'completed',
        licenseKey: license.licenseKey,
        tier: license.tier,
        expiresAt: license.expiresAt,
        server: license.guilds?.[0]?.guildName || null
      });
    }

    return ApiResponse.error(res, 'Failed to create license', null, 500);
  } catch (error) {
    logger.error('Verify payment error:', error);
    return ApiResponse.error(res, 'Failed to verify payment', null, 500);
  }
}

// Get purchase history for user (their purchased licenses)
async function getPurchaseHistory(req, res) {
  try {
    const licenses = await models.License.findAll({
      where: {
        createdByUserId: req.user.userId
      },
      include: [
        { model: models.Guild, as: 'guilds', required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    // Format licenses with additional info
    const formattedLicenses = licenses.map(license => ({
      id: license.id,
      licenseKey: license.licenseKey,
      tier: license.tier,
      isActive: license.isActive,
      expiresAt: license.expiresAt,
      createdAt: license.createdAt,
      isExpired: license.expiresAt ? new Date() > new Date(license.expiresAt) : false,
      inUse: license.guilds && license.guilds.length > 0,
      servers: license.guilds ? license.guilds.map(g => ({
        id: g.guildId,
        name: g.guildName,
        isActive: g.isActive
      })) : [],
      metadata: license.metadata
    }));

    return ApiResponse.success(res, formattedLicenses);
  } catch (error) {
    logger.error('Get purchase history error:', error);
    return ApiResponse.error(res, 'Failed to fetch purchase history', null, 500);
  }
}

// Stripe webhook handler
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        await handleSuccessfulPayment(session);
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      logger.error(`Payment failed: ${paymentIntent.id}`, paymentIntent.last_payment_error);
      break;
    }

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

// Handle successful payment - create license (user will activate it manually)
async function handleSuccessfulPayment(session) {
  try {
    const { userId, discordId, planId, duration, promoCode } = session.metadata;

    // Check if license already created for this session
    const existingLicense = await models.License.findOne({
      where: {
        metadata: {
          stripeSessionId: session.id
        }
      }
    });

    if (existingLicense) {
      logger.info(`License already exists for session ${session.id}`);
      return existingLicense;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(duration));

    // Generate license key with KIRA- prefix
    const licenseKey = utils.generateLicenseKey('VIP');

    // Create license (not assigned to any server yet)
    const license = await models.License.create({
      licenseKey,
      tier: 'VIP',
      maxServers: 1, // 1 server per license
      createdByUserId: parseInt(userId),
      expiresAt,
      isActive: true,
      metadata: {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        planId,
        promoCode: promoCode || null,
        amountPaid: session.amount_total
      }
    });

    logger.info(`License created: ${licenseKey} for user ${discordId}, session ${session.id}`);

    // Update promo code usage if used
    if (promoCode) {
      await models.PromoCode?.increment('usedCount', {
        where: { code: promoCode.toUpperCase() }
      });
    }

    return license;
  } catch (error) {
    logger.error('Handle successful payment error:', error);
    throw error;
  }
}

module.exports = {
  getPlans,
  validatePromoCode,
  createCheckout,
  verifyPayment,
  getPurchaseHistory,
  handleWebhook
};
