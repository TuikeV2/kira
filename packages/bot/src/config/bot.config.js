require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  defaultLicenseKey: process.env.DEFAULT_LICENSE_KEY,
  environment: process.env.NODE_ENV || 'development'
};
