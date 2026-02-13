const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const applyText = (canvas, text) => {
  const context = canvas.getContext('2d');
  let fontSize = 70;

  do {
    context.font = `${fontSize -= 10}px sans-serif`;
  } while (context.measureText(text).width > canvas.width - 300);

  return context.font;
};

// Helper to replace variables in message
const replaceVariables = (text, member, joinedAt) => {
  const memberDuration = joinedAt
    ? Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return text
    .replace(/{user}/g, `<@${member.user.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{displayName}/g, member.displayName || member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{userId}/g, member.user.id)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{joinedAt}/g, joinedAt ? joinedAt.toLocaleDateString('pl-PL') : 'Nieznane')
    .replace(/{memberDuration}/g, memberDuration.toString())
    .replace(/{avatar}/g, member.user.displayAvatarURL({ dynamic: true }));
};

// Parse color from string or number
const parseColor = (color) => {
  if (!color) return 0xff0000; // default red for goodbye
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    if (color.startsWith('#')) {
      return parseInt(color.replace('#', ''), 16);
    }
    return parseInt(color, 16);
  }
  return 0xff0000;
};

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      const guild = await models.Guild.findOne({
        where: { guildId: member.guild.id, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guild || !guild.settings || !guild.settings.goodbyeEnabled) {
        return;
      }

      // Sprawdz czy serwer ma wazna licencje
      if (!guild.license || !guild.license.isValid()) {
        logger.debug(`Guild ${member.guild.id} has no valid license - blocking goodbye messages`);
        return;
      }

      const settings = guild.settings;

      // Check if we should ignore bots
      if (settings.goodbyeIgnoreBots && member.user.bot) {
        logger.debug(`Skipping goodbye for bot ${member.user.tag}`);
        return;
      }

      const {
        goodbyeChannelId,
        goodbyeMessage,
        goodbyeImage,
        goodbyeTitle,
        goodbyeColor,
        goodbyeFooter,
        goodbyeThumbnail,
        goodbyeShowRoles,
        goodbyeShowJoinDate
      } = settings;

      if (!goodbyeChannelId) return;

      const channel = member.guild.channels.cache.get(goodbyeChannelId);
      if (!channel) {
        logger.warn(`Goodbye channel ${goodbyeChannelId} not found in guild ${member.guild.name}`);
        return;
      }

      // Get member's joined date (might be null if member was not cached)
      const joinedAt = member.joinedAt;

      // Create goodbye image
      const canvas = createCanvas(700, 250);
      const context = canvas.getContext('2d');

      // Background image or gradient
      if (goodbyeImage && goodbyeImage.startsWith('data:image')) {
        const base64Data = goodbyeImage.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const background = await loadImage(buffer);
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
      } else {
        // Gradient background
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2e1a1a');
        gradient.addColorStop(1, '#1a1a2e');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Dark overlay
      context.fillStyle = 'rgba(0, 0, 0, 0.4)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Border with embed color
      const borderColor = goodbyeColor || '#ff0000';
      context.strokeStyle = borderColor;
      context.lineWidth = 4;
      context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Title
      context.font = 'bold 28px sans-serif';
      context.fillStyle = '#ffffff';
      const titleText = goodbyeTitle || 'Goodbye!';
      context.fillText(titleText, canvas.width / 2.5, canvas.height / 3.5);

      // Username
      context.font = applyText(canvas, member.user.username);
      context.fillStyle = '#ffffff';
      context.fillText(member.user.username, canvas.width / 2.5, canvas.height / 1.8);

      // Member count
      context.font = '20px sans-serif';
      context.fillStyle = '#aaaaaa';
      context.fillText(`${member.guild.memberCount} members remain`, canvas.width / 2.5, canvas.height / 1.3);

      // Avatar
      context.save();
      context.beginPath();
      context.arc(125, 125, 100, 0, Math.PI * 2, true);
      context.closePath();
      context.clip();

      const avatarURL = member.user.displayAvatarURL({ extension: 'jpg', size: 256 });
      const avatar = await loadImage(avatarURL);
      context.drawImage(avatar, 25, 25, 200, 200);
      context.restore();

      // Avatar border
      context.beginPath();
      context.arc(125, 125, 100, 0, Math.PI * 2, true);
      context.strokeStyle = borderColor;
      context.lineWidth = 4;
      context.stroke();

      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'goodbye-image.png' });

      // Create embed
      const description = replaceVariables(goodbyeMessage || '{username} has left the server.', member, joinedAt);

      const embed = new EmbedBuilder()
        .setColor(parseColor(goodbyeColor))
        .setTitle(goodbyeTitle || `Goodbye!`)
        .setDescription(description)
        .setImage('attachment://goodbye-image.png')
        .setTimestamp();

      // Add thumbnail if enabled
      if (goodbyeThumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
      }

      // Add footer if set
      if (goodbyeFooter) {
        embed.setFooter({ text: goodbyeFooter });
      }

      // Show roles the user had
      if (goodbyeShowRoles && member.roles && member.roles.cache) {
        const roles = member.roles.cache
          .filter(r => r.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map(r => `<@&${r.id}>`)
          .slice(0, 10); // Limit to 10 roles

        if (roles.length > 0) {
          embed.addFields({
            name: 'Role',
            value: roles.join(', '),
            inline: false
          });
        }
      }

      // Show join date and duration
      if (goodbyeShowJoinDate && joinedAt) {
        const memberDuration = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
        embed.addFields({
            name: 'Czas na serwerze',
            value: `Dolaczyl: ${joinedAt.toLocaleDateString('pl-PL')}\nByl z nami: ${memberDuration} dni`,
            inline: false
        });
      }

      await channel.send({ embeds: [embed], files: [attachment] });
      logger.info(`Sent goodbye embed for ${member.user.username} in ${member.guild.name}`);

    } catch (error) {
      logger.error(`Error sending goodbye message in guild ${member.guild?.id}:`, error);
    }
  }
};
