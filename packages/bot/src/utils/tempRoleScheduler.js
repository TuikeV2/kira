const { models } = require('@kira/shared');
const logger = require('./logger');

// In-memory store for scheduled removals
const scheduledRemovals = new Map();

/**
 * Schedule a temporary role removal
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @param {number} durationSeconds - Duration in seconds
 */
function scheduleTempRoleRemoval(client, guildId, userId, roleId, durationSeconds) {
  const key = `${guildId}_${userId}_${roleId}`;

  // Cancel existing timeout if any
  if (scheduledRemovals.has(key)) {
    clearTimeout(scheduledRemovals.get(key));
  }

  const timeoutId = setTimeout(async () => {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        logger.warn(`[TempRole] Guild ${guildId} not found for role removal`);
        scheduledRemovals.delete(key);
        return;
      }

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        logger.warn(`[TempRole] Member ${userId} not found in guild ${guildId}`);
        scheduledRemovals.delete(key);
        return;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        logger.warn(`[TempRole] Role ${roleId} not found in guild ${guildId}`);
        scheduledRemovals.delete(key);
        return;
      }

      if (!member.roles.cache.has(roleId)) {
        logger.debug(`[TempRole] Member ${userId} no longer has role ${roleId}`);
        scheduledRemovals.delete(key);
        return;
      }

      await member.roles.remove(roleId);
      logger.info(`[TempRole] Removed temporary role ${role.name} from ${member.user.tag} after ${durationSeconds}s`);

      // Send DM notification
      try {
        await member.send(`Your temporary role **${role.name}** in **${guild.name}** has expired.`);
      } catch (err) {
        logger.debug(`[TempRole] Could not DM user ${userId}`);
      }

      scheduledRemovals.delete(key);
    } catch (error) {
      logger.error(`[TempRole] Error removing temporary role:`, error);
      scheduledRemovals.delete(key);
    }
  }, durationSeconds * 1000);

  scheduledRemovals.set(key, timeoutId);
  logger.info(`[TempRole] Scheduled removal of role ${roleId} for user ${userId} in ${durationSeconds}s`);
}

/**
 * Cancel a scheduled temporary role removal
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 */
function cancelTempRoleRemoval(guildId, userId, roleId) {
  const key = `${guildId}_${userId}_${roleId}`;
  if (scheduledRemovals.has(key)) {
    clearTimeout(scheduledRemovals.get(key));
    scheduledRemovals.delete(key);
    logger.info(`[TempRole] Cancelled scheduled removal for ${key}`);
    return true;
  }
  return false;
}

module.exports = {
  scheduleTempRoleRemoval,
  cancelTempRoleRemoval
};
