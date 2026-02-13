const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { sequelize } = require('@kira/shared');
const config = require('./config/api.config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');

const authRoutes = require('./routes/auth.routes');
const licenseRoutes = require('./routes/license.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const moderationRoutes = require('./routes/moderation.routes');
const ticketRoutes = require('./routes/ticket.routes');
const customCommandRoutes = require('./routes/customCommand.routes');
const giveawayRoutes = require('./routes/giveaway.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const webhookRoutes = require('./routes/webhook.routes');
const promoCodeRoutes = require('./routes/promoCode.routes');
const adminRoutes = require('./routes/admin.routes');
const musicRoutes = require('./routes/music.routes');

const app = express();

app.set('trust proxy', 1); 

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});

app.use(helmet());
app.use(cors({
  origin: [config.frontendUrl, /^http:\/\/145\.239\.89\.133/, 'https://kiraevo.pl', /\.kiraevo\.pl$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Dodaj dozwolone metody
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

// ZWIĘKSZONO LIMIT DANYCH DO 50MB (dla obrazków Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cookieParser());
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/custom-commands', customCommandRoutes);
app.use('/api/giveaways', giveawayRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/music', musicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    logger.info('Starting API server...');

    logger.info('Connecting to database...');
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Wyłączono alter aby uniknąć błędu "Too many keys" - schemat już istnieje
    await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`API server running on port ${config.port}`);
      logger.info(`Environment: ${config.environment}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await sequelize.close();
  process.exit(0);
});

start();
