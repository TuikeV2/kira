const { Events } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');

// Map do sledzenia czasu dolaczenia do kanalu glosowego
// Format: `${guildId}_${memberId}` -> { joinTime, channelId }
const voiceSessionMap = new Map();

// Interwał do przyznawania XP (co minute)
const XP_INTERVAL = 60 * 1000; // 1 minuta

// Map do sledzenia interwalow serwera
const guildIntervals = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;

    try {
      // Pobierz ustawienia serwera
      const guildData = await models.Guild.findOne({
        where: { guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      // Sprawdz licencje i czy voice XP jest wlaczone
      if (!guildData || !guildData.license?.isValid()) return;
      if (!guildData.settings?.levelingEnabled || !guildData.settings?.voiceXpEnabled) return;

      const settings = guildData.settings;
      const sessionKey = `${guildId}_${member.id}`;

      // Uzytkownik dolaczyl do kanalu
      if (!oldState.channelId && newState.channelId) {
        await handleJoinVoice(member, newState, settings, sessionKey);
      }
      // Uzytkownik opuscil kanal
      else if (oldState.channelId && !newState.channelId) {
        await handleLeaveVoice(member, oldState, settings, sessionKey);
      }
      // Uzytkownik zmienil kanal
      else if (oldState.channelId !== newState.channelId) {
        // Opusc stary, dolacz do nowego
        await handleLeaveVoice(member, oldState, settings, sessionKey);
        await handleJoinVoice(member, newState, settings, sessionKey);
      }
      // Zmiana stanu (mute/unmute, video on/off)
      else if (oldState.channelId === newState.channelId) {
        await handleStateChange(member, newState, settings, sessionKey);
      }

      // Uruchom interwał dla serwera jesli nie istnieje
      startGuildInterval(guildId);

    } catch (error) {
      logger.error(`Error in voiceXp event:`, error);
    }
  }
};

async function handleJoinVoice(member, state, settings, sessionKey) {
  const channel = state.channel;
  if (!channel) return;

  // Sprawdz czy to kanal AFK
  if (settings.voiceXpIgnoreAfk && channel.id === state.guild.afkChannelId) {
    logger.debug(`[VoiceXP] Ignoring AFK channel for ${member.user.tag}`);
    return;
  }

  // Sprawdz czy uzytkownik spelnia wymagania
  if (!checkVoiceRequirements(state, settings)) {
    logger.debug(`[VoiceXP] ${member.user.tag} doesn't meet requirements`);
    return;
  }

  // Zapisz czas dolaczenia
  voiceSessionMap.set(sessionKey, {
    joinTime: Date.now(),
    channelId: channel.id,
    lastXpTime: Date.now()
  });

  logger.debug(`[VoiceXP] ${member.user.tag} joined voice channel ${channel.name}`);
}

async function handleLeaveVoice(member, state, settings, sessionKey) {
  const session = voiceSessionMap.get(sessionKey);
  if (!session) return;

  voiceSessionMap.delete(sessionKey);
  logger.debug(`[VoiceXP] ${member.user.tag} left voice channel`);
}

async function handleStateChange(member, state, settings, sessionKey) {
  const session = voiceSessionMap.get(sessionKey);

  // Sprawdz wymagania
  if (!checkVoiceRequirements(state, settings)) {
    // Usun sesje jesli nie spelnia wymagan
    if (session) {
      voiceSessionMap.delete(sessionKey);
      logger.debug(`[VoiceXP] ${member.user.tag} no longer meets requirements`);
    }
    return;
  }

  // Jesli nie ma sesji, a teraz spelnia wymagania - dodaj
  if (!session) {
    voiceSessionMap.set(sessionKey, {
      joinTime: Date.now(),
      channelId: state.channelId,
      lastXpTime: Date.now()
    });
    logger.debug(`[VoiceXP] ${member.user.tag} now meets requirements`);
  }
}

function checkVoiceRequirements(state, settings) {
  // Sprawdz czy jest zmutowany (jesli wymagane unmuted)
  if (settings.voiceXpRequireUnmuted) {
    if (state.selfMute || state.serverMute || state.selfDeaf || state.serverDeaf) {
      return false;
    }
  }

  // Sprawdz czy ma kamere (jesli wymagane)
  if (settings.voiceXpRequireVideo && !state.selfVideo) {
    return false;
  }

  return true;
}

function startGuildInterval(guildId) {
  if (guildIntervals.has(guildId)) return;

  const interval = setInterval(async () => {
    await processGuildVoiceXp(guildId);
  }, XP_INTERVAL);

  guildIntervals.set(guildId, interval);
  logger.debug(`[VoiceXP] Started interval for guild ${guildId}`);
}

async function processGuildVoiceXp(guildId) {
  try {
    // Pobierz ustawienia serwera
    const guildData = await models.Guild.findOne({
      where: { guildId, isActive: true },
      include: [{ model: models.License, as: 'license' }]
    });

    if (!guildData || !guildData.license?.isValid()) return;
    if (!guildData.settings?.levelingEnabled || !guildData.settings?.voiceXpEnabled) return;

    const settings = guildData.settings;
    const xpPerMinute = settings.voiceXpPerMinute || 5;

    // Znajdz wszystkie sesje dla tego serwera
    const guildSessions = [];
    for (const [key, session] of voiceSessionMap.entries()) {
      if (key.startsWith(`${guildId}_`)) {
        const memberId = key.split('_')[1];
        guildSessions.push({ memberId, session, key });
      }
    }

    if (guildSessions.length === 0) return;

    // Pobierz serwer
    const { client } = require('../index');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    for (const { memberId, session, key } of guildSessions) {
      try {
        const member = await guild.members.fetch(memberId).catch(() => null);
        if (!member) {
          voiceSessionMap.delete(key);
          continue;
        }

        // Sprawdz czy nadal jest na kanale
        const voiceState = member.voice;
        if (!voiceState.channelId) {
          voiceSessionMap.delete(key);
          continue;
        }

        // Sprawdz czy kanal to AFK
        if (settings.voiceXpIgnoreAfk && voiceState.channelId === guild.afkChannelId) {
          continue;
        }

        // Sprawdz wymagania
        if (!checkVoiceRequirements(voiceState, settings)) {
          continue;
        }

        // Sprawdz czy sa inni uzytkownicy na kanale (nie boty)
        const channel = voiceState.channel;
        const humanMembers = channel.members.filter(m => !m.user.bot);
        if (humanMembers.size < 2) {
          // Sam na kanale - nie przyznawaj XP
          continue;
        }

        // Sprawdz role blokujace XP
        const noXpRoles = settings.levelingNoXpRoles || [];
        let hasNoXpRole = false;
        for (const roleId of noXpRoles) {
          if (member.roles.cache.has(roleId)) {
            hasNoXpRole = true;
            break;
          }
        }
        if (hasNoXpRole) continue;

        // Przyznaj XP
        await awardVoiceXp(member, guildId, xpPerMinute, settings);

      } catch (err) {
        logger.error(`[VoiceXP] Error processing member ${memberId}:`, err);
      }
    }

  } catch (error) {
    logger.error(`[VoiceXP] Error processing guild ${guildId}:`, error);
  }
}

async function awardVoiceXp(member, guildId, xpAmount, settings) {
  try {
    // Pobierz lub utworz rekord
    let [userLevel, created] = await models.UserLevel.findOrCreate({
      where: {
        discordId: member.id,
        guildId: guildId
      },
      defaults: {
        xp: 0,
        level: 0,
        totalMessages: 0
      }
    });

    const oldLevel = userLevel.level;
    userLevel.xp += xpAmount;

    // Oblicz nowy poziom
    const newLevel = models.UserLevel.getLevelFromXp(userLevel.xp);

    if (newLevel > oldLevel) {
      userLevel.level = newLevel;

      // Wyslij powiadomienie o awansie (jesli jest kanał)
      if (settings.levelingChannelId) {
        const { client } = require('../index');
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(settings.levelingChannelId);

        if (channel) {
          const { EmbedBuilder } = require('discord.js');

          const milestones = settings.levelingMilestones || [];
          const isMilestone = milestones.includes(newLevel);

          let messageTemplate = settings.levelingMessage || 'Gratulacje {user}! Osiagnales **poziom {level}**!';
          if (isMilestone && settings.levelingMilestoneMessage) {
            messageTemplate = settings.levelingMilestoneMessage;
          }

          const description = messageTemplate
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{username}/g, member.user.username)
            .replace(/{level}/g, newLevel.toString())
            .replace(/{server}/g, guild.name)
            .replace(/{totalXp}/g, userLevel.xp.toLocaleString());

          const embed = new EmbedBuilder()
            .setColor(isMilestone ? '#ff6b00' : '#ffd700')
            .setDescription(`${description}\n*Awans za aktywnosc glosowa!*`)
            .setTimestamp();

          if (isMilestone) {
            embed.setTitle('Kamien Milowy!');
          }

          await channel.send({ embeds: [embed] });
        }
      }

      // Przyznaj role za poziomy
      const levelRoles = settings.levelRoles || [];
      const stackRoles = settings.levelRolesStack !== false;

      for (const lr of levelRoles) {
        if (lr.level <= newLevel) {
          const role = member.guild.roles.cache.get(lr.roleId);
          if (role && !member.roles.cache.has(lr.roleId)) {
            if (stackRoles || lr.level === newLevel) {
              await member.roles.add(role, `Level ${newLevel} reward (voice)`);
              logger.info(`[VoiceXP] Assigned role ${role.name} to ${member.user.username}`);
            }
          }
        }
      }

      logger.info(`[VoiceXP] ${member.user.username} leveled up to ${newLevel} in ${member.guild.name}`);
    }

    await userLevel.save();
    logger.debug(`[VoiceXP] Awarded ${xpAmount} XP to ${member.user.username} in ${member.guild.name}`);

  } catch (error) {
    logger.error(`[VoiceXP] Error awarding XP to ${member.user.tag}:`, error);
  }
}

// Eksportuj funkcje do zatrzymania interwalow (cleanup)
module.exports.cleanup = () => {
  for (const [guildId, interval] of guildIntervals.entries()) {
    clearInterval(interval);
  }
  guildIntervals.clear();
  voiceSessionMap.clear();
};
