const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { findUsedInvite } = require('../utils/inviteCache');

const applyText = (canvas, text) => {
  const context = canvas.getContext('2d');
  let fontSize = 70;

  do {
    context.font = `${fontSize -= 10}px sans-serif`;
  } while (context.measureText(text).width > canvas.width - 300);

  return context.font;
};

// Helper to replace variables in message
const replaceVariables = (text, member) => {
  const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return text
    .replace(/{user}/g, `<@${member.user.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{displayName}/g, member.displayName || member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{userId}/g, member.user.id)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{createdAt}/g, member.user.createdAt.toLocaleDateString('pl-PL'))
    .replace(/{accountAge}/g, accountAge.toString())
    .replace(/{avatar}/g, member.user.displayAvatarURL({ dynamic: true }));
};

// Parse color from string or number
const parseColor = (color) => {
  if (!color) return 0x00ff00;
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    if (color.startsWith('#')) {
      return parseInt(color.replace('#', ''), 16);
    }
    return parseInt(color, 16);
  }
  return 0x00ff00;
};

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const guild = await models.Guild.findOne({
        where: { guildId: member.guild.id, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guild) return;

      // Sprawdź czy serwer ma ważną licencję
      if (!guild.license || !guild.license.isValid()) {
        logger.debug(`Guild ${member.guild.id} has no valid license - blocking welcome features`);
        return;
      }

      const settings = guild.settings || {};

      // Calculate account age
      const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const isNewAccount = settings.minAccountAge > 0 && accountAge < settings.minAccountAge;

      // Handle account age protection
      if (isNewAccount && settings.minAccountAge > 0) {
        await handleAccountAgeProtection(member, settings, accountAge);
      }

      // Invite tracking
      await handleInviteLogging(member, guild);

      // Auto-role
      if (settings.autoRoleEnabled && settings.autoRoleIds?.length > 0) {
        await handleAutoRole(member, settings);
      }

      // Welcome DM
      if (settings.welcomeDmEnabled && settings.welcomeDmMessage) {
        await sendWelcomeDM(member, settings);
      }

      // Welcome message
      if (settings.welcomeEnabled) {
        // Check if we should ignore bots
        if (settings.welcomeIgnoreBots && member.user.bot) {
          logger.debug(`Skipping welcome for bot ${member.user.tag}`);
          return;
        }

        // Handle delay
        const delay = (settings.welcomeDelay || 0) * 1000;
        if (delay > 0) {
          setTimeout(() => sendWelcomeMessage(member, settings, isNewAccount), delay);
        } else {
          await sendWelcomeMessage(member, settings, isNewAccount);
        }
      }

    } catch (error) {
      logger.error(`Error in guildMemberAdd for guild ${member.guild.id}:`, error);
    }
  }
};

async function handleAccountAgeProtection(member, settings, accountAge) {
  try {
    const action = settings.minAccountAgeAction || 'none';

    if (action === 'kick') {
      try {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Nie możesz dołączyć do tego serwera')
            .setDescription(`Twoje konto jest zbyt młode (${accountAge} dni). Serwer wymaga kont starszych niż ${settings.minAccountAge} dni.`)
            .setTimestamp()
          ]
        }).catch(() => {});

        await member.kick(`Konto zbyt młode: ${accountAge} dni (wymagane: ${settings.minAccountAge})`);
        logger.info(`Kicked ${member.user.tag} from ${member.guild.name} - account too young (${accountAge} days)`);
      } catch (e) {
        logger.error(`Failed to kick young account ${member.user.tag}:`, e);
      }
    } else if (action === 'notify' && settings.minAccountAgeNotifyChannelId) {
      const notifyChannel = member.guild.channels.cache.get(settings.minAccountAgeNotifyChannelId);
      if (notifyChannel) {
        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('Nowe konto dołączyło')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`${member.user.tag} ma konto młodsze niż ${settings.minAccountAge} dni.`)
          .addFields(
            { name: 'Użytkownik', value: `<@${member.user.id}>`, inline: true },
            { name: 'Wiek konta', value: `${accountAge} dni`, inline: true },
            { name: 'Utworzone', value: member.user.createdAt.toLocaleDateString('pl-PL'), inline: true }
          )
          .setTimestamp();

        await notifyChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    logger.error(`Error handling account age protection:`, error);
  }
}

async function handleAutoRole(member, settings) {
  try {
    // Check if we should ignore bots
    if (settings.autoRoleIgnoreBots && member.user.bot) {
      return;
    }

    const delay = (settings.autoRoleDelay || 0) * 1000;

    const assignRoles = async () => {
      for (const roleId of settings.autoRoleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          try {
            await member.roles.add(role, 'Auto-role on join');
            logger.info(`Added auto-role ${role.name} to ${member.user.tag} in ${member.guild.name}`);
          } catch (e) {
            logger.error(`Failed to add auto-role ${role.name} to ${member.user.tag}:`, e.message);
          }
        }
      }
    };

    if (delay > 0) {
      setTimeout(assignRoles, delay);
    } else {
      await assignRoles();
    }
  } catch (error) {
    logger.error(`Error handling auto-role:`, error);
  }
}

async function sendWelcomeDM(member, settings) {
  try {
    if (member.user.bot) return;

    const message = replaceVariables(settings.welcomeDmMessage, member);

    const embed = new EmbedBuilder()
      .setColor(parseColor(settings.welcomeColor || '#00ff00'))
      .setTitle(`Witaj na ${member.guild.name}!`)
      .setDescription(message)
      .setThumbnail(member.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    await member.send({ embeds: [embed] });
    logger.info(`Sent welcome DM to ${member.user.tag}`);
  } catch (error) {
    // User probably has DMs disabled
    logger.debug(`Could not send welcome DM to ${member.user.tag}: ${error.message}`);
  }
}

async function sendWelcomeMessage(member, settings, isNewAccount = false) {
  try {
    const { welcomeChannelId, welcomeMessage, welcomeImage, welcomeTitle, welcomeColor, welcomeFooter, welcomeThumbnail, welcomePingUser } = settings;

    if (!welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) {
      logger.warn(`Welcome channel ${welcomeChannelId} not found in guild ${member.guild.name}`);
      return;
    }

    // Create welcome image
    const canvas = createCanvas(700, 250);
    const context = canvas.getContext('2d');

    if (welcomeImage && welcomeImage.startsWith('data:image')) {
      const base64Data = welcomeImage.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const background = await loadImage(buffer);
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
      // Gradient background
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dark overlay
    context.fillStyle = 'rgba(0, 0, 0, 0.4)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Border with embed color
    const borderColor = welcomeColor || '#00ff00';
    context.strokeStyle = borderColor;
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Title
    context.font = 'bold 28px sans-serif';
    context.fillStyle = '#ffffff';
    const titleText = welcomeTitle || 'Welcome!';
    context.fillText(titleText, canvas.width / 2.5, canvas.height / 3.5);

    // Username
    context.font = applyText(canvas, member.user.username);
    context.fillStyle = '#ffffff';
    context.fillText(member.user.username, canvas.width / 2.5, canvas.height / 1.8);

    // Member count
    context.font = '20px sans-serif';
    context.fillStyle = '#aaaaaa';
    context.fillText(`Member #${member.guild.memberCount}`, canvas.width / 2.5, canvas.height / 1.3);

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

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome-image.png' });

    // Create embed
    const description = replaceVariables(welcomeMessage || 'Welcome {username}!', member);

    const embed = new EmbedBuilder()
      .setColor(parseColor(welcomeColor))
      .setTitle(welcomeTitle || `Welcome to ${member.guild.name}!`)
      .setDescription(description)
      .setImage('attachment://welcome-image.png')
      .setTimestamp();

    // Add thumbnail if enabled
    if (welcomeThumbnail) {
      embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    }

    // Add footer if set
    if (welcomeFooter) {
      embed.setFooter({ text: welcomeFooter });
    }

    // Add warning for new account
    if (isNewAccount) {
      embed.addFields({
        name: 'Nowe konto',
        value: `Konto utworzone ${Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24))} dni temu`,
        inline: false
      });
    }

    // Build message content
    const messageContent = {};
    messageContent.embeds = [embed];
    messageContent.files = [attachment];

    // Add ping if enabled
    if (welcomePingUser) {
      messageContent.content = `<@${member.user.id}>`;
    }

    await channel.send(messageContent);
    logger.info(`Sent welcome embed for ${member.user.username} in ${member.guild.name}`);

  } catch (error) {
    logger.error(`Error sending welcome message in guild ${member.guild?.id}:`, error);
  }
}

async function handleInviteLogging(member, guildData) {
  try {
    const settings = guildData.settings || {};

    // Sprawdź czy invite logging jest włączony
    if (!settings.inviteLoggingEnabled) {
      return;
    }

    // Znajdź użyte zaproszenie
    const inviteInfo = await findUsedInvite(member);

    // Zapisz log do bazy danych
    const inviteLog = await models.InviteLog.create({
      guildId: member.guild.id,
      memberId: member.user.id,
      memberTag: member.user.tag,
      inviterId: inviteInfo?.inviterId || null,
      inviterTag: inviteInfo?.inviterTag || null,
      inviteCode: inviteInfo?.code || null,
      joinType: inviteInfo?.joinType || 'UNKNOWN',
      accountCreatedAt: member.user.createdAt
    });

    logger.info(`[InviteLog] ${member.user.tag} joined ${member.guild.name} via ${inviteInfo?.code || 'unknown'} (invited by ${inviteInfo?.inviterTag || 'unknown'})`);

    // Wyślij wiadomość do kanału logów jeśli jest skonfigurowany
    const logChannelId = settings.inviteLogChannelId;
    if (logChannelId) {
      const logChannel = member.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const isNewAccount = accountAge < 7;

        const embed = new EmbedBuilder()
          .setColor(isNewAccount ? '#ff9900' : '#00ff00')
          .setAuthor({
            name: member.user.tag,
            iconURL: member.user.displayAvatarURL()
          })
          .setTitle('Nowy Członek')
          .addFields(
            { name: 'Użytkownik', value: `<@${member.user.id}>`, inline: true },
            { name: 'ID', value: member.user.id, inline: true },
            { name: 'Wiek konta', value: `${accountAge} dni ${isNewAccount ? '⚠️' : ''}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: `Członek #${member.guild.memberCount}` });

        if (inviteInfo) {
          if (inviteInfo.joinType === 'VANITY') {
            embed.addFields({ name: 'Dołączył przez', value: `Vanity URL: \`${inviteInfo.code}\``, inline: false });
          } else if (inviteInfo.inviterId) {
            embed.addFields(
              { name: 'Zaproszony przez', value: `<@${inviteInfo.inviterId}> (${inviteInfo.inviterTag})`, inline: true },
              { name: 'Kod zaproszenia', value: `\`${inviteInfo.code}\``, inline: true }
            );
          } else {
            embed.addFields({ name: 'Dołączył przez', value: `Kod: \`${inviteInfo.code}\``, inline: false });
          }
        } else {
          embed.addFields({ name: 'Dołączył przez', value: 'Nieznane', inline: false });
        }

        if (isNewAccount) {
          embed.setDescription('⚠️ **Nowe konto** - utworzone mniej niż 7 dni temu');
        }

        await logChannel.send({ embeds: [embed] });
      }
    }

  } catch (error) {
    logger.error(`[InviteLog] Error logging invite for ${member.user.tag}:`, error);
  }
}
