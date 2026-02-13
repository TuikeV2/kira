const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');
const { sequelize } = require('@kira/shared');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startGiveawayScheduler } = require('./utils/giveawayScheduler');
const { startStatsUpdater } = require('./utils/statsUpdater');
const { startLicenseReminderScheduler } = require('./utils/licenseReminderScheduler');
const { initMusicManager } = require('./utils/musicManager');
const { startInternalApi } = require('./internal-api');
const { QueueManager } = require('./utils/queueManager');
const logger = require('./utils/logger');
const config = require('./config/bot.config');
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const LavalinkNodes = [
  {
    name: 'main',
    url: `${process.env.LAVALINK_HOST || 'localhost'}:${process.env.LAVALINK_PORT || 2333}`,
    auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass'
  }
];

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), LavalinkNodes, {
  moveOnDisconnect: false,
  reconnectTries: 10,
  reconnectInterval: 5000,
  restTimeout: 60000
});

shoukaku.on('ready', (name) => logger.info(`Lavalink node "${name}" connected`));
shoukaku.on('error', (name, error) => logger.error(`Lavalink node "${name}" error:`, error));
shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink node "${name}" closed (${code}): ${reason}`));
shoukaku.on('disconnect', (name, count) => logger.warn(`Lavalink node "${name}" disconnected, reconnect attempt #${count}`));
shoukaku.on('debug', (name, info) => logger.info(`[Shoukaku] ${info}`));
shoukaku.on('raw', (name, json) => {
  if (json.op === 'event' || json.op === 'playerUpdate') {
    logger.info(`[Shoukaku] op=${json.op} type=${json.type || 'update'} guild=${json.guildId || ''}`);
  }
});

client.shoukaku = shoukaku;
client.queue = new QueueManager();

async function start() {
  try {
    logger.info('Starting bot...');

    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    loadCommands(client);
    loadEvents(client);

    await client.login(config.token);

    startGiveawayScheduler(client);
    startStatsUpdater(client);
    startLicenseReminderScheduler(client);
    await initMusicManager(client);
    startInternalApi(client);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  try {
    await sequelize.close();
    for (const [name] of client.shoukaku.nodes) {
      client.shoukaku.removeNode(name, 'Bot shutting down');
    }
    client.destroy();
  } catch (err) {
    logger.error('Shutdown error:', err);
  }
  process.exit(0);
});

start();
