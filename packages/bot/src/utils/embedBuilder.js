const { EmbedBuilder } = require('discord.js');

function createSuccessEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(title)
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

function createErrorEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(title)
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

function createInfoEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(title)
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

function createWarningEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setColor(0xFFFF00)
    .setTitle(title)
    .setTimestamp();
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createWarningEmbed
};
