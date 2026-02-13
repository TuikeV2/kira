const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing "data" or "execute" property`);
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands total`);
}

module.exports = { loadCommands };
