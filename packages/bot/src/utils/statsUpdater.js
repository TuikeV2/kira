const { models } = require('@kira/shared');
const logger = require('./logger');
const { ChannelType } = require('discord.js');

// Mapa interwałów dla każdego serwera
const guildIntervals = new Map();

// Minimalny interwał (Discord rate limit)
const MIN_INTERVAL = 5;
const DEFAULT_INTERVAL = 10;

// Mapowanie tierów boostów
const BOOST_TIER_NAMES = {
  0: 'Brak',
  1: 'Poziom 1',
  2: 'Poziom 2',
  3: 'Poziom 3'
};

// Nazwy dni tygodnia
const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTH_NAMES = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

// Funkcja do obliczania wszystkich statystyk serwera
function calculateGuildStats(guild, memberGoal = 1000) {
  const members = guild.members.cache;
  const channels = guild.channels.cache;
  const now = new Date();

  // Członkowie w voice z różnymi statusami
  const voiceMembers = members.filter(m => m.voice?.channelId);

  // Oblicz dni od utworzenia serwera
  const createdAt = guild.createdAt;
  const createdDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  const stats = {
    // Członkowie
    members: guild.memberCount,
    humans: members.filter(m => !m.user.bot).size,
    bots: members.filter(m => m.user.bot).size,
    goal: memberGoal,
    toGoal: Math.max(0, memberGoal - guild.memberCount),
    goalPercent: Math.min(100, Math.round((guild.memberCount / memberGoal) * 100)),

    // Statusy online
    online: members.filter(m => m.presence?.status && m.presence.status !== 'offline').size,
    offline: members.filter(m => !m.presence?.status || m.presence.status === 'offline').size,
    dnd: members.filter(m => m.presence?.status === 'dnd').size,
    idle: members.filter(m => m.presence?.status === 'idle').size,
    streaming: members.filter(m =>
      m.presence?.activities?.some(a => a.type === 1) // ActivityType.Streaming
    ).size,

    // Aktywność głosowa
    voice: voiceMembers.size,
    voiceMuted: voiceMembers.filter(m => m.voice?.selfMute || m.voice?.serverMute).size,
    voiceDeaf: voiceMembers.filter(m => m.voice?.selfDeaf || m.voice?.serverDeaf).size,
    voiceStreaming: voiceMembers.filter(m => m.voice?.streaming).size,
    voiceCamera: voiceMembers.filter(m => m.voice?.selfVideo).size,

    // Kanały
    channels: channels.size,
    textChannels: channels.filter(c => c.type === ChannelType.GuildText).size,
    voiceChannels: channels.filter(c => c.type === ChannelType.GuildVoice).size,
    categories: channels.filter(c => c.type === ChannelType.GuildCategory).size,
    threads: channels.filter(c =>
      c.type === ChannelType.PublicThread ||
      c.type === ChannelType.PrivateThread ||
      c.type === ChannelType.AnnouncementThread
    ).size,
    forumChannels: channels.filter(c => c.type === ChannelType.GuildForum).size,
    stageChannels: channels.filter(c => c.type === ChannelType.GuildStageVoice).size,
    announcements: channels.filter(c => c.type === ChannelType.GuildAnnouncement).size,

    // Role
    roles: guild.roles.cache.size,

    // Boosty
    boosts: guild.premiumSubscriptionCount || 0,
    boostLevel: guild.premiumTier,
    boostTier: BOOST_TIER_NAMES[guild.premiumTier] || 'Brak',
    boosters: members.filter(m => m.premiumSince).size,

    // Emoji i naklejki
    emojis: guild.emojis.cache.size,
    animatedEmojis: guild.emojis.cache.filter(e => e.animated).size,
    staticEmojis: guild.emojis.cache.filter(e => !e.animated).size,
    stickers: guild.stickers.cache.size,

    // Informacje o serwerze
    createdDays: createdDays,
    createdDate: createdAt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    verificationLevel: guild.verificationLevel,

    // Data i czas
    date: now.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }),
    day: DAY_NAMES[now.getDay()],
    month: MONTH_NAMES[now.getMonth()],
    year: now.getFullYear()
  };

  return stats;
}

// Funkcja do podstawiania zmiennych w szablonie nazwy kanału
function applyTemplate(template, stats) {
  let result = template;

  // Zastąp wszystkie zmienne
  Object.entries(stats).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  });

  // Ogranicz do 100 znaków (limit Discord)
  return result.substring(0, 100);
}

async function updateStatsChannels(client, specificGuildId = null) {
  try {
    const whereClause = { isActive: true };
    if (specificGuildId) {
      whereClause.guildId = specificGuildId;
    }

    const guilds = await models.Guild.findAll({
      where: whereClause
    });

    for (const guildData of guilds) {
      const settings = guildData.settings || {};
      const statsConfig = settings.statsChannels;
      const hasCustomChannels = (settings.customStatsChannels || []).length > 0;

      // Jeśli nie ma żadnych kanałów statystyk, pomiń
      if ((!statsConfig || !statsConfig.enabled) && !hasCustomChannels) continue;

      const guild = client.guilds.cache.get(guildData.guildId);
      if (!guild) continue;

      // Fetchuj członków dla dokładnych statystyk (online, offline, humans, bots itp.)
      try {
        await guild.members.fetch();
        logger.debug(`Fetched ${guild.members.cache.size} members for guild ${guild.name}`);
      } catch (fetchError) {
        logger.warn(`Failed to fetch members for guild ${guild.id}:`, fetchError.message);
      }

      // Pobierz konfigurowalne nazwy kanałów
      const channelNames = statsConfig?.channelNames || {};

      // Domyślne nazwy
      const defaultNames = {
        members: 'Członkowie: {count}',
        humans: 'Ludzie: {count}',
        boosts: 'Boosty: {count}',
        boostLevel: 'Boost: {level}',
        online: 'Online: {count}',
        bots: 'Boty: {count}',
        roles: 'Role: {count}',
        channels: 'Kanały: {count}',
        textChannels: 'Tekstowe: {count}',
        voiceChannels: 'Głosowe: {count}',
        categories: 'Kategorie: {count}',
        voiceActive: 'Na voice: {count}',
        emojis: 'Emoji: {count}',
        stickers: 'Naklejki: {count}',
        goal: '{count}/{goal} członków',
        date: '📅 {date}',
        time: '🕐 {time}'
      };

      const finalNames = { ...defaultNames, ...channelNames };

      // Aktualizuj standardowe kanały statystyk tylko jeśli statsConfig istnieje
      if (statsConfig) {
        // Aktualizuj kanał członków
        if (statsConfig.membersChannelId) {
          const name = finalNames.members.replace('{count}', guild.memberCount);
          await updateChannel(guild, statsConfig.membersChannelId, name);
        }

        // Aktualizuj kanał ludzi (bez botów)
        if (statsConfig.humansChannelId) {
          const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
          const name = finalNames.humans.replace('{count}', humanCount);
          await updateChannel(guild, statsConfig.humansChannelId, name);
        }

        // Aktualizuj kanał boostów
        if (statsConfig.boostsChannelId) {
          const name = finalNames.boosts.replace('{count}', guild.premiumSubscriptionCount || 0);
          await updateChannel(guild, statsConfig.boostsChannelId, name);
        }

        // Aktualizuj kanał poziomu boost
        if (statsConfig.boostLevelChannelId) {
          const tierName = BOOST_TIER_NAMES[guild.premiumTier] || 'Brak';
          const name = finalNames.boostLevel.replace('{level}', tierName);
          await updateChannel(guild, statsConfig.boostLevelChannelId, name);
        }

        // Aktualizuj kanał ról
        if (statsConfig.rolesChannelId) {
          const name = finalNames.roles.replace('{count}', guild.roles.cache.size);
          await updateChannel(guild, statsConfig.rolesChannelId, name);
        }

        // Aktualizuj kanał wszystkich kanałów
        if (statsConfig.channelsChannelId) {
          const name = finalNames.channels.replace('{count}', guild.channels.cache.size);
          await updateChannel(guild, statsConfig.channelsChannelId, name);
        }

        // Aktualizuj kanał tekstowych
        if (statsConfig.textChannelsChannelId) {
          const textCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
          const name = finalNames.textChannels.replace('{count}', textCount);
          await updateChannel(guild, statsConfig.textChannelsChannelId, name);
        }

        // Aktualizuj kanał głosowych
        if (statsConfig.voiceChannelsChannelId) {
          const voiceCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
          const name = finalNames.voiceChannels.replace('{count}', voiceCount);
          await updateChannel(guild, statsConfig.voiceChannelsChannelId, name);
        }

        // Aktualizuj kanał kategorii
        if (statsConfig.categoriesChannelId) {
          const categoryCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
          const name = finalNames.categories.replace('{count}', categoryCount);
          await updateChannel(guild, statsConfig.categoriesChannelId, name);
        }

        // Aktualizuj kanał online
        if (statsConfig.onlineChannelId) {
          const onlineMembers = guild.members.cache.filter(m =>
            m.presence?.status && m.presence.status !== 'offline'
          ).size;
          const name = finalNames.online.replace('{count}', onlineMembers);
          await updateChannel(guild, statsConfig.onlineChannelId, name);
        }

        // Aktualizuj kanał aktywnych na voice
        if (statsConfig.voiceActiveChannelId) {
          const voiceMembers = guild.members.cache.filter(m => m.voice?.channelId).size;
          const name = finalNames.voiceActive.replace('{count}', voiceMembers);
          await updateChannel(guild, statsConfig.voiceActiveChannelId, name);
        }

        // Aktualizuj kanał botów
        if (statsConfig.botsChannelId) {
          const botCount = guild.members.cache.filter(m => m.user.bot).size;
          const name = finalNames.bots.replace('{count}', botCount);
          await updateChannel(guild, statsConfig.botsChannelId, name);
        }

        // Aktualizuj kanał emoji
        if (statsConfig.emojisChannelId) {
          const emojiCount = guild.emojis.cache.size;
          const name = finalNames.emojis.replace('{count}', emojiCount);
          await updateChannel(guild, statsConfig.emojisChannelId, name);
        }

        // Aktualizuj kanał naklejek
        if (statsConfig.stickersChannelId) {
          const stickerCount = guild.stickers.cache.size;
          const name = finalNames.stickers.replace('{count}', stickerCount);
          await updateChannel(guild, statsConfig.stickersChannelId, name);
        }

        // Aktualizuj kanał celu członków
        if (statsConfig.goalChannelId && statsConfig.memberGoal) {
          const name = finalNames.goal
            .replace('{count}', guild.memberCount)
            .replace('{goal}', statsConfig.memberGoal);
          await updateChannel(guild, statsConfig.goalChannelId, name);
        }

        // Aktualizuj kanał daty
        if (statsConfig.dateChannelId) {
          const currentDate = new Date().toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const name = finalNames.date.replace('{date}', currentDate);
          await updateChannel(guild, statsConfig.dateChannelId, name);
        }

        // Aktualizuj kanał godziny
        if (statsConfig.timeChannelId) {
          const currentTime = new Date().toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Warsaw'
          });
          const name = finalNames.time.replace('{time}', currentTime);
          await updateChannel(guild, statsConfig.timeChannelId, name);
        }
      }

      // ========== CUSTOM STATS CHANNELS ==========
      const customStatsChannels = settings.customStatsChannels || [];
      if (customStatsChannels.length > 0) {
        // Oblicz wszystkie statystyki raz dla wszystkich custom kanałów
        const stats = calculateGuildStats(guild, statsConfig?.memberGoal || 1000);

        for (const customChannel of customStatsChannels) {
          if (!customChannel.id || !customChannel.nameTemplate) continue;

          try {
            const channelName = applyTemplate(customChannel.nameTemplate, stats);
            await updateChannel(guild, customChannel.id, channelName);
          } catch (error) {
            logger.error(`Failed to update custom stats channel ${customChannel.id}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error updating stats channels:', error);
  }
}

async function updateChannel(guild, channelId, name) {
  try {
    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.type === ChannelType.GuildVoice) {
      // Only update if name changed to avoid rate limits
      if (channel.name !== name) {
        await channel.setName(name);
        logger.debug(`Updated stats channel ${channelId} to "${name}" in ${guild.name}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to update stats channel ${channelId}:`, error.message);
  }
}

function startStatsUpdater(client) {
  // Główna pętla sprawdzająca serwery i ich indywidualne interwały
  const CHECK_INTERVAL = 60 * 1000; // Sprawdzaj co minutę

  // Inicjalna aktualizacja po 30 sekundach
  setTimeout(async () => {
    await updateStatsChannels(client);
    await setupGuildIntervals(client);
  }, 30000);

  // Regularne sprawdzanie i aktualizacja interwałów
  setInterval(async () => {
    await setupGuildIntervals(client);
  }, CHECK_INTERVAL);

  logger.info('Stats channel updater started (dynamic intervals per guild)');
}

async function setupGuildIntervals(client) {
  try {
    const guilds = await models.Guild.findAll({
      where: { isActive: true }
    });

    for (const guildData of guilds) {
      const settings = guildData.settings || {};
      const statsConfig = settings.statsChannels;
      const hasCustomChannels = (settings.customStatsChannels || []).length > 0;
      const hasStandardChannels = statsConfig?.enabled;

      // Jeśli nie ma żadnych kanałów statystyk, usuń interwał
      if (!hasStandardChannels && !hasCustomChannels) {
        if (guildIntervals.has(guildData.guildId)) {
          clearInterval(guildIntervals.get(guildData.guildId).intervalId);
          guildIntervals.delete(guildData.guildId);
          logger.debug(`Removed stats interval for guild ${guildData.guildId}`);
        }
        continue;
      }

      const refreshInterval = Math.max(statsConfig?.refreshInterval || DEFAULT_INTERVAL, MIN_INTERVAL);
      const intervalMs = refreshInterval * 60 * 1000;

      // Sprawdź czy interwał już istnieje z tym samym czasem
      const existingInterval = guildIntervals.get(guildData.guildId);
      if (existingInterval && existingInterval.interval === refreshInterval) {
        continue; // Już ustawiony prawidłowo
      }

      // Usuń stary interwał jeśli istnieje
      if (existingInterval) {
        clearInterval(existingInterval.intervalId);
      }

      // Utwórz nowy interwał
      const intervalId = setInterval(() => {
        updateStatsChannels(client, guildData.guildId);
      }, intervalMs);

      guildIntervals.set(guildData.guildId, {
        intervalId,
        interval: refreshInterval
      });

      logger.debug(`Set stats interval for guild ${guildData.guildId}: ${refreshInterval} minutes`);
    }
  } catch (error) {
    logger.error('Error setting up guild intervals:', error);
  }
}

function stopStatsUpdater() {
  // Zatrzymaj wszystkie indywidualne interwały
  for (const [guildId, intervalData] of guildIntervals) {
    clearInterval(intervalData.intervalId);
  }
  guildIntervals.clear();
  logger.info('Stats channel updater stopped');
}

// Funkcja do wymuszenia aktualizacji konkretnego serwera
async function forceUpdateGuild(client, guildId) {
  await updateStatsChannels(client, guildId);
}

module.exports = {
  startStatsUpdater,
  stopStatsUpdater,
  updateStatsChannels,
  forceUpdateGuild
};
