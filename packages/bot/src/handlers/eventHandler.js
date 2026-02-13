const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    logger.info(`Loaded event: ${event.name}`);
  }

  logger.info(`Loaded ${eventFiles.length} events total`);
}

module.exports = { loadEvents };
