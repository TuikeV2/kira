// kira/packages/bot/src/events/messageCreate.js
const { Events, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { handleMusicRequest } = require('../utils/musicManager');

// Cooldown map dla systemu poziomow (userId_guildId -> timestamp)
const levelingCooldowns = new Map();

// Dopasowuje rozmiar czcionki aby tekst zmiescil sie w maxWidth
function fitText(context, text, maxWidth, maxFontSize, minFontSize = 14, fontWeight = 'bold') {
  let fontSize = maxFontSize;
  do {
    context.font = `${fontWeight} ${fontSize}px sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  } while (fontSize > minFontSize);
  return fontSize;
}

// Funkcja do generowania obrazka awansu
async function generateLevelUpImage(user, level, backgroundImage, isMilestone = false) {
  const canvas = createCanvas(700, 250);
  const context = canvas.getContext('2d');

  // Tlo
  if (backgroundImage && backgroundImage.startsWith('data:image')) {
    try {
      const base64Data = backgroundImage.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const background = await loadImage(buffer);
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Gradient background
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    // Gradient background
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Nakladka polprzezroczysta
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Ramka - zlota dla milestone, standardowa dla zwyklego awansu
  const borderColor = isMilestone ? '#ff6b00' : '#ffd700';
  context.strokeStyle = borderColor;
  context.lineWidth = isMilestone ? 5 : 3;
  context.strokeRect(0, 0, canvas.width, canvas.height);

  // Obszar tekstowy (na prawo od avatara)
  const textStartX = 260;
  const maxTextWidth = canvas.width - textStartX - 30;

  // Tekst "Level Up!" lub "MILESTONE!" - dopasowanie rozmiaru
  const titleText = isMilestone ? 'MILESTONE!' : 'LEVEL UP!';
  const titleFontSize = fitText(context, titleText, maxTextWidth, 36, 20);
  context.font = `bold ${titleFontSize}px sans-serif`;
  context.fillStyle = borderColor;
  context.shadowColor = 'rgba(0, 0, 0, 0.6)';
  context.shadowBlur = 6;
  context.fillText(titleText, textStartX, 80);

  // Nazwa uzytkownika i poziom - pelny nick, automatyczne dopasowanie czcionki
  const levelText = `${user.username} osiagnal poziom ${level}!`;
  const levelFontSize = fitText(context, levelText, maxTextWidth, 28, 14);
  context.font = `bold ${levelFontSize}px sans-serif`;
  context.fillStyle = '#ffffff';
  context.fillText(levelText, textStartX, 80 + titleFontSize + 20);

  // Dodatkowy podtekst z poziomem (dekoracyjny)
  const subText = `Level ${level}`;
  context.font = 'bold 22px sans-serif';
  context.fillStyle = borderColor;
  context.globalAlpha = 0.7;
  context.fillText(subText, textStartX, 80 + titleFontSize + 20 + levelFontSize + 18);
  context.globalAlpha = 1.0;

  // Reset cienia
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;

  // Avatar uzytkownika (okragly)
  context.save();
  context.beginPath();
  context.arc(125, 125, 100, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();

  const avatarURL = user.displayAvatarURL({ extension: 'jpg', size: 256 });
  const avatar = await loadImage(avatarURL);
  context.drawImage(avatar, 25, 25, 200, 200);
  context.restore();

  // Obramowanie avatara
  context.strokeStyle = borderColor;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(125, 125, 100, 0, Math.PI * 2, true);
  context.stroke();

  return canvas.toBuffer('image/png');
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // 1. Ignoruj boty i wiadomosci systemowe
    if (message.author.bot || !message.guild) return;

    try {
      // 2. Pobierz ustawienia serwera i sprawdz licencje
      const guildData = await models.Guild.findOne({
        where: { guildId: message.guild.id },
        include: [{ model: models.License, as: 'license' }]
      });

      // Sprawdz czy serwer ma wazna licencje - jesli nie, blokuj wszystkie funkcje
      if (!guildData || !guildData.license || !guildData.license.isValid()) {
        return; // Brak licencji lub niewazna - nie wykonuj zadnych funkcji
      }

      // === SYSTEM MUZYKI - REQUEST CHANNEL ===
      if (guildData?.settings?.music?.enabled && guildData?.settings?.music?.requestChannelId) {
        if (message.channel.id === guildData.settings.music.requestChannelId) {
          await handleMusicRequest(message, guildData);
          return; // nie przetwarzaj dalej
        }
      }

      // === SYSTEM POZIOMOW ===
      if (guildData?.settings?.levelingEnabled) {
        await handleLeveling(message, guildData);
      }

      // 3. Obsluga Custom Commands
      const handled = await handleCustomCommands(message, guildData);
      if (handled) return;

      // 4. AutoMod
      const automod = require('../utils/automod');
      try {
        await automod.checkMessage(message, guildData);
      } catch (error) {
        logger.error('AutoMod error:', error);
      }

    } catch (error) {
      logger.error('Blad w AutoMod (messageCreate):', error);
    }
  }
};

// Funkcja obliczajaca mnoznik XP
function calculateXpMultiplier(message, member, settings) {
  if (!settings.xpMultiplierEnabled) return 1;

  let multiplier = 1;

  // Weekend multiplier (sobota = 6, niedziela = 0)
  const dayOfWeek = new Date().getDay();
  if ((dayOfWeek === 0 || dayOfWeek === 6) && settings.weekendMultiplier > 1) {
    multiplier *= settings.weekendMultiplier;
  }

  // Channel multiplier
  const channelMultipliers = settings.channelMultipliers || [];
  const channelMult = channelMultipliers.find(m => m.channelId === message.channel.id);
  if (channelMult) {
    multiplier *= channelMult.multiplier;
  }

  // Role multiplier (uzywamy najwyzszego)
  const roleMultipliers = settings.roleMultipliers || [];
  let highestRoleMult = 1;
  for (const rm of roleMultipliers) {
    if (member.roles.cache.has(rm.roleId)) {
      if (rm.multiplier > highestRoleMult) {
        highestRoleMult = rm.multiplier;
      }
    }
  }
  multiplier *= highestRoleMult;

  return multiplier;
}

// Funkcja sprawdzajaca czy uzytkownik moze zdobywac XP
function canEarnXp(message, member, settings) {
  // Sprawdz ignorowane kanaly
  const ignoredChannels = settings.levelingIgnoredChannels || [];
  if (ignoredChannels.includes(message.channel.id)) {
    return false;
  }

  // Sprawdz role blokujace XP
  const noXpRoles = settings.levelingNoXpRoles || [];
  for (const roleId of noXpRoles) {
    if (member.roles.cache.has(roleId)) {
      return false;
    }
  }

  return true;
}

// Funkcja obliczajaca ilosc XP do przyznania
function calculateXpAmount(settings) {
  if (settings.xpRandomEnabled) {
    const min = settings.xpPerMessageMin || 10;
    const max = settings.xpPerMessageMax || 25;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return settings.xpPerMessage || 15;
}

// Funkcja obslugujaca system poziomow
async function handleLeveling(message, guildData) {
  const settings = guildData.settings;
  const member = message.member;

  // Sprawdz czy uzytkownik moze zdobywac XP
  if (!canEarnXp(message, member, settings)) {
    return;
  }

  const cooldownKey = `${message.author.id}_${message.guild.id}`;
  const cooldownTime = (settings.levelingCooldown || 60) * 1000; // domyslnie 60 sekund

  // Sprawdz cooldown
  const lastMessage = levelingCooldowns.get(cooldownKey);
  if (lastMessage && Date.now() - lastMessage < cooldownTime) {
    return;
  }

  // Ustaw nowy cooldown
  levelingCooldowns.set(cooldownKey, Date.now());

  // Pobierz lub utworz rekord uzytkownika
  let [userLevel, created] = await models.UserLevel.findOrCreate({
    where: {
      discordId: message.author.id,
      guildId: message.guild.id
    },
    defaults: {
      xp: 0,
      level: 0,
      totalMessages: 0
    }
  });

  // Oblicz ilosc XP
  let xpToAdd = calculateXpAmount(settings);

  // Zastosuj mnozniki
  const multiplier = calculateXpMultiplier(message, member, settings);
  xpToAdd = Math.floor(xpToAdd * multiplier);

  const oldLevel = userLevel.level;

  userLevel.xp += xpToAdd;
  userLevel.totalMessages += 1;
  userLevel.lastMessageAt = new Date();

  // Oblicz nowy poziom
  const newLevel = models.UserLevel.getLevelFromXp(userLevel.xp);

  if (newLevel > oldLevel) {
    userLevel.level = newLevel;

    // Sprawdz czy to milestone
    const milestones = settings.levelingMilestones || [];
    const isMilestone = milestones.includes(newLevel);

    // Wyslij powiadomienie o awansie
    await sendLevelUpNotification(message, userLevel, settings, isMilestone);

    // Przyznaj role za poziomy
    await assignLevelRoles(member, newLevel, oldLevel, settings);

    // Wyslij DM jesli wlaczone
    if (settings.levelingAnnounceDm) {
      await sendLevelUpDM(message.author, userLevel, settings, message.guild.name, isMilestone);
    }
  }

  await userLevel.save();
}

// Funkcja wysylajaca powiadomienie o awansie
async function sendLevelUpNotification(message, userLevel, settings, isMilestone = false) {
  const channelId = settings.levelingChannelId;

  // Jesli nie wybrano kanalu, wyslij w tym samym kanale
  const channel = channelId
    ? message.guild.channels.cache.get(channelId)
    : message.channel;

  if (!channel) return;

  try {
    const imageBuffer = await generateLevelUpImage(
      message.author,
      userLevel.level,
      settings.levelingImage,
      isMilestone
    );

    const attachment = new AttachmentBuilder(imageBuffer, { name: 'levelup.png' });

    // Wybierz wiadomosc (milestone lub standardowa)
    let messageTemplate = settings.levelingMessage || 'Gratulacje {user}! Osiagnales **poziom {level}**!';
    if (isMilestone && settings.levelingMilestoneMessage) {
      messageTemplate = settings.levelingMilestoneMessage;
    }

    const description = messageTemplate
      .replace(/{user}/g, `<@${message.author.id}>`)
      .replace(/{username}/g, message.author.username)
      .replace(/{level}/g, userLevel.level.toString())
      .replace(/{server}/g, message.guild.name)
      .replace(/{totalXp}/g, userLevel.xp.toLocaleString());

    const embed = new EmbedBuilder()
      .setColor(isMilestone ? '#ff6b00' : '#ffd700')
      .setDescription(description)
      .setImage('attachment://levelup.png')
      .setTimestamp();

    if (isMilestone) {
      embed.setTitle('Kamien Milowy!');
    }

    await channel.send({ embeds: [embed], files: [attachment] });
    logger.info(`Level up notification sent for ${message.author.username} (level ${userLevel.level}${isMilestone ? ' - MILESTONE' : ''}) in ${message.guild.name}`);
  } catch (error) {
    logger.error('Error sending level up notification:', error);
  }
}

// Funkcja wysylajaca DM o awansie
async function sendLevelUpDM(user, userLevel, settings, guildName, isMilestone = false) {
  try {
    let messageTemplate = settings.levelingMessage || 'Gratulacje! Osiagnales **poziom {level}**!';
    if (isMilestone && settings.levelingMilestoneMessage) {
      messageTemplate = settings.levelingMilestoneMessage;
    }

    const description = messageTemplate
      .replace(/{user}/g, user.username)
      .replace(/{username}/g, user.username)
      .replace(/{level}/g, userLevel.level.toString())
      .replace(/{server}/g, guildName)
      .replace(/{totalXp}/g, userLevel.xp.toLocaleString());

    const embed = new EmbedBuilder()
      .setColor(isMilestone ? '#ff6b00' : '#ffd700')
      .setTitle(`Level Up na ${guildName}!`)
      .setDescription(description)
      .setTimestamp();

    if (isMilestone) {
      embed.setTitle(`Kamien Milowy na ${guildName}!`);
    }

    await user.send({ embeds: [embed] });
  } catch (error) {
    // Uzytkownik prawdopodobnie ma wylaczone DM
    logger.debug(`Could not send level up DM to ${user.tag}: ${error.message}`);
  }
}

// Funkcja przyznajaca role za poziomy
async function assignLevelRoles(member, newLevel, oldLevel, settings) {
  const levelRoles = settings.levelRoles || [];
  const stackRoles = settings.levelRolesStack !== false; // domyslnie true
  const removeLower = settings.levelRolesRemoveLower || false;

  if (!levelRoles.length) return;

  try {
    // Znajdz role do przyznania
    const rolesToAdd = [];
    const rolesToRemove = [];

    for (const lr of levelRoles) {
      const role = member.guild.roles.cache.get(lr.roleId);
      if (!role) continue;

      if (lr.level <= newLevel) {
        // Rola dla tego lub nizszego poziomu
        if (stackRoles) {
          // Kumuluj wszystkie role
          if (!member.roles.cache.has(lr.roleId)) {
            rolesToAdd.push(role);
          }
        } else {
          // Tylko najwyzsza rola
          if (lr.level === newLevel && !member.roles.cache.has(lr.roleId)) {
            rolesToAdd.push(role);
          } else if (lr.level < newLevel && removeLower && member.roles.cache.has(lr.roleId)) {
            rolesToRemove.push(role);
          }
        }
      }
    }

    // Dodaj role
    for (const role of rolesToAdd) {
      await member.roles.add(role, `Level ${newLevel} reward`);
      logger.info(`Assigned role ${role.name} to ${member.user.username} for reaching level ${newLevel}`);
    }

    // Usun stare role (jesli removeLower jest wlaczone i stackRoles jest wylaczone)
    for (const role of rolesToRemove) {
      await member.roles.remove(role, 'Lower level role removed');
      logger.info(`Removed role ${role.name} from ${member.user.username} (lower level role)`);
    }
  } catch (error) {
    logger.error('Error assigning level roles:', error);
  }
}

// ============================================================================
// CUSTOM COMMANDS HANDLER
// ============================================================================

/**
 * Process variables in response text
 * @param {string} text - Response text with variables
 * @param {Message} message - Discord message
 * @returns {string} - Processed text
 */
function processVariables(text, message) {
  const args = message.content.split(' ').slice(1).join(' ');

  return text
    .replace(/{user}/g, `<@${message.author.id}>`)
    .replace(/{username}/g, message.author.username)
    .replace(/{displayName}/g, message.member?.displayName || message.author.username)
    .replace(/{server}/g, message.guild.name)
    .replace(/{channel}/g, `<#${message.channel.id}>`)
    .replace(/{channelName}/g, message.channel.name)
    .replace(/{memberCount}/g, message.guild.memberCount.toString())
    .replace(/{args}/g, args || '')
    .replace(/{date}/g, new Date().toLocaleDateString())
    .replace(/{time}/g, new Date().toLocaleTimeString());
}

/**
 * Check if member has required role for command
 * @param {GuildMember} member - Discord guild member
 * @param {string[]} allowedRoles - Array of allowed role IDs
 * @returns {boolean} - Whether member can use command
 */
function hasRequiredRole(member, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Handle custom commands (prefix + auto-response)
 * @param {Message} message - Discord message
 * @param {Object} guildData - Guild data
 * @returns {Promise<boolean>} - Whether a command was handled
 */
async function handleCustomCommands(message, guildData) {
  const customCommandPrefix = guildData?.settings?.customCommandPrefix || '!';
  const contentLower = message.content.toLowerCase();

  try {
    // Pobierz wszystkie komendy dla serwera
    const commands = await models.CustomCommand.findAll({
      where: { guildId: message.guild.id }
    });

    if (!commands || commands.length === 0) return false;

    let matchedCommand = null;

    // 1. Sprawdz prefix commands
    if (message.content.startsWith(customCommandPrefix)) {
      const commandName = message.content.slice(customCommandPrefix.length).split(' ')[0].toLowerCase();

      if (commandName) {
        matchedCommand = commands.find(cmd => {
          if (cmd.isAutoResponse) return false;
          if (cmd.commandName === commandName) return true;
          const aliases = cmd.aliases || [];
          return aliases.includes(commandName);
        });
      }
    }

    // 2. Sprawdz auto-responses (trigger words w wiadomosci)
    if (!matchedCommand) {
      matchedCommand = commands.find(cmd => {
        if (!cmd.isAutoResponse) return false;
        // Sprawdz glowna nazwe
        if (contentLower.includes(cmd.commandName.toLowerCase())) return true;
        // Sprawdz aliasy
        const aliases = cmd.aliases || [];
        return aliases.some(alias => contentLower.includes(alias.toLowerCase()));
      });
    }

    if (!matchedCommand) return false;

    // 3. Sprawdz uprawnienia (role)
    if (!hasRequiredRole(message.member, matchedCommand.allowedRoles)) {
      return false; // Brak uprawnien - nie odpowiadaj
    }

    // 4. Zwieksz licznik uzyc
    await matchedCommand.increment('usageCount');

    // 5. Przetworz zmienne w odpowiedzi
    const processedResponse = processVariables(matchedCommand.response, message);
    const processedTitle = matchedCommand.embedTitle
      ? processVariables(matchedCommand.embedTitle, message)
      : null;

    // 6. Wyslij odpowiedz
    if (matchedCommand.embedEnabled) {
      const embed = new EmbedBuilder()
        .setDescription(processedResponse)
        .setColor(matchedCommand.embedColor || '#5865F2');

      if (processedTitle) {
        embed.setTitle(processedTitle);
      }

      if (matchedCommand.embedImage) {
        embed.setImage(matchedCommand.embedImage);
      }

      await message.channel.send({ embeds: [embed] });
    } else {
      await message.channel.send(processedResponse);
    }

    return true;
  } catch (error) {
    logger.error('Error executing custom command:', error);
    return false;
  }
}
