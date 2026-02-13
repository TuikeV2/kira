const logger = require('./logger');

// Cache zaproszeń dla każdego serwera: Map<guildId, Map<code, uses>>
const inviteCache = new Map();

/**
 * Inicjalizacja cache zaproszeń dla wszystkich serwerów bota
 * @param {Client} client - Discord client
 */
async function initializeInviteCache(client) {
  logger.info('[InviteCache] Initializing invite cache...');

  for (const guild of client.guilds.cache.values()) {
    try {
      await cacheGuildInvites(guild);
    } catch (error) {
      logger.warn(`[InviteCache] Failed to cache invites for guild ${guild.name}: ${error.message}`);
    }
  }

  logger.info(`[InviteCache] Cached invites for ${inviteCache.size} guilds`);
}

/**
 * Cache zaproszeń dla konkretnego serwera
 * @param {Guild} guild - Discord guild
 */
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const inviteMap = new Map();

    for (const invite of invites.values()) {
      inviteMap.set(invite.code, {
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.tag || 'Unknown'
      });
    }

    // Dodaj też vanity URL jeśli istnieje
    if (guild.vanityURLCode) {
      try {
        const vanityData = await guild.fetchVanityData();
        inviteMap.set(guild.vanityURLCode, {
          uses: vanityData.uses || 0,
          inviterId: null,
          inviterTag: 'Vanity URL',
          isVanity: true
        });
      } catch (e) {
        // Guild może nie mieć uprawnień do vanity
      }
    }

    inviteCache.set(guild.id, inviteMap);
    logger.debug(`[InviteCache] Cached ${inviteMap.size} invites for guild ${guild.name}`);
  } catch (error) {
    logger.warn(`[InviteCache] Could not fetch invites for ${guild.name}: ${error.message}`);
  }
}

/**
 * Znajdź zaproszenie użyte przez nowego członka
 * @param {GuildMember} member - Nowy członek
 * @returns {Object|null} - Informacje o użytym zaproszeniu
 */
async function findUsedInvite(member) {
  const guild = member.guild;
  const cachedInvites = inviteCache.get(guild.id);

  if (!cachedInvites) {
    logger.warn(`[InviteCache] No cached invites for guild ${guild.name}`);
    return null;
  }

  try {
    const currentInvites = await guild.invites.fetch();

    // Znajdź zaproszenie, które ma więcej użyć niż w cache
    for (const invite of currentInvites.values()) {
      const cached = cachedInvites.get(invite.code);

      if (cached && invite.uses > cached.uses) {
        // Znaleziono użyte zaproszenie
        const result = {
          code: invite.code,
          inviterId: invite.inviter?.id || null,
          inviterTag: invite.inviter?.tag || 'Unknown',
          joinType: 'INVITE'
        };

        // Zaktualizuj cache
        cachedInvites.set(invite.code, {
          uses: invite.uses,
          inviterId: invite.inviter?.id || null,
          inviterTag: invite.inviter?.tag || 'Unknown'
        });

        return result;
      }
    }

    // Sprawdź vanity URL
    if (guild.vanityURLCode) {
      try {
        const vanityData = await guild.fetchVanityData();
        const cachedVanity = cachedInvites.get(guild.vanityURLCode);

        if (cachedVanity && vanityData.uses > cachedVanity.uses) {
          cachedInvites.set(guild.vanityURLCode, {
            uses: vanityData.uses,
            inviterId: null,
            inviterTag: 'Vanity URL',
            isVanity: true
          });

          return {
            code: guild.vanityURLCode,
            inviterId: null,
            inviterTag: 'Vanity URL',
            joinType: 'VANITY'
          };
        }
      } catch (e) {
        // Ignore vanity errors
      }
    }

    // Sprawdź czy jakieś zaproszenie zostało usunięte (jednorazowe)
    for (const [code, data] of cachedInvites.entries()) {
      if (!currentInvites.has(code) && !data.isVanity) {
        // Zaproszenie zostało usunięte - prawdopodobnie jednorazowe
        cachedInvites.delete(code);
        return {
          code: code,
          inviterId: data.inviterId,
          inviterTag: data.inviterTag,
          joinType: 'INVITE'
        };
      }
    }

    // Zaktualizuj cache z nowymi zaproszeniami
    await cacheGuildInvites(guild);

    return null;
  } catch (error) {
    logger.error(`[InviteCache] Error finding used invite: ${error.message}`);
    return null;
  }
}

/**
 * Dodaj nowe zaproszenie do cache
 * @param {Invite} invite - Discord invite
 */
function addInvite(invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;

  if (!inviteCache.has(guildId)) {
    inviteCache.set(guildId, new Map());
  }

  inviteCache.get(guildId).set(invite.code, {
    uses: invite.uses || 0,
    inviterId: invite.inviter?.id || null,
    inviterTag: invite.inviter?.tag || 'Unknown'
  });

  logger.debug(`[InviteCache] Added invite ${invite.code} to cache`);
}

/**
 * Usuń zaproszenie z cache
 * @param {Invite} invite - Discord invite
 */
function removeInvite(invite) {
  const guildId = invite.guild?.id;
  if (!guildId) return;

  const guildCache = inviteCache.get(guildId);
  if (guildCache) {
    guildCache.delete(invite.code);
    logger.debug(`[InviteCache] Removed invite ${invite.code} from cache`);
  }
}

/**
 * Usuń cache dla serwera
 * @param {string} guildId - ID serwera
 */
function removeGuildCache(guildId) {
  inviteCache.delete(guildId);
  logger.debug(`[InviteCache] Removed cache for guild ${guildId}`);
}

module.exports = {
  initializeInviteCache,
  cacheGuildInvites,
  findUsedInvite,
  addInvite,
  removeInvite,
  removeGuildCache,
  inviteCache
};
