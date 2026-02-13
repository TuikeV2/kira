const { Events } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');

// Helper function to normalize emoji for consistent comparison
// Removes variation selectors (U+FE0F) that can cause mismatches
function normalizeEmoji(str) {
  if (!str) return '';
  return str.replace(/\uFE0F/g, '');
}

// Helper function to get consistent emoji identifier
function getEmojiIdentifier(emoji) {
  // Custom emoji: use ID (e.g., "123456789")
  if (emoji.id) {
    return emoji.id;
  }
  // Unicode emoji: normalize and return name
  return normalizeEmoji(emoji.name) || normalizeEmoji(emoji.toString());
}

// Helper function to match emoji with stored value
function matchEmoji(emoji, storedEmoji) {
  if (!storedEmoji) return false;

  const normalizedStored = normalizeEmoji(storedEmoji);

  // Custom emoji - match by ID
  if (emoji.id) {
    if (storedEmoji === emoji.id) return true;
    if (normalizedStored === emoji.id) return true;
    // Check if stored contains the ID (for <:name:id> format)
    if (storedEmoji.includes(emoji.id)) return true;
    return false;
  }

  // Unicode emoji - normalize both sides for comparison
  const normalizedEmojiName = normalizeEmoji(emoji.name);
  const normalizedEmojiStr = normalizeEmoji(emoji.toString());

  if (normalizedStored === normalizedEmojiName) return true;
  if (normalizedStored === normalizedEmojiStr) return true;
  if (storedEmoji === emoji.name) return true;
  if (storedEmoji === emoji.toString()) return true;

  return false;
}

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;

    // Fetch partials if needed
    try {
      if (reaction.partial) {
        await reaction.fetch();
      }
      if (reaction.message.partial) {
        await reaction.message.fetch();
      }
    } catch (error) {
      logger.error('Error fetching reaction/message partial:', error);
      return;
    }

    try {
      const { message } = reaction;

      // Skip if no guild (DMs)
      if (!message.guild) return;

      const guildId = message.guild.id;

      logger.debug(`Reaction removed: emoji=${getEmojiIdentifier(reaction.emoji)}, messageId=${message.id}, user=${user.tag}`);

      const guildData = await models.Guild.findOne({
        where: { guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guildData || !guildData.settings || !guildData.settings.reactionRoles) return;

      // Sprawdź czy serwer ma ważną licencję
      if (!guildData.license || !guildData.license.isValid()) {
        logger.debug(`[ReactionRole] Guild ${guildId} has no valid license - blocking reaction roles`);
        return;
      }

      const panel = guildData.settings.reactionRoles.find(p => p.messageId === message.id);
      if (!panel) return;

      // Find the role associated with the emoji
      logger.debug(`Looking for emoji: ${getEmojiIdentifier(reaction.emoji)} in panel roles: ${JSON.stringify(panel.roles.map(r => r.emoji))}`);

      const roleConfig = panel.roles.find(r => matchEmoji(reaction.emoji, r.emoji));

      if (!roleConfig) {
        logger.debug(`No role config found for emoji: ${getEmojiIdentifier(reaction.emoji)} on panel ${panel.id}`);
        return;
      }

      logger.debug(`Matched roleConfig for removal: emoji=${roleConfig.emoji}, roleId=${roleConfig.roleId}`);

      const roleId = roleConfig.roleId;

      // Validate role exists
      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        logger.warn(`Role ${roleId} not found on server ${guildId}`);
        return;
      }

      const member = await message.guild.members.fetch(user.id);

      // Check if member has the role
      if (!member.roles.cache.has(roleId)) {
        return;
      }

      // Check if panel is enabled
      if (panel.enabled === false) {
        logger.debug(`[ReactionRole] Panel ${panel.id} is disabled, ignoring removal`);
        return;
      }

      // Import helpers
      const { checkPanelMode, sendDMNotification, logRoleChange } = require('../utils/reactionRoleHelpers');
      const { cancelTempRoleRemoval } = require('../utils/tempRoleScheduler');

      // Check panel mode - VERIFY mode prevents removal
      const modeCheck = checkPanelMode(member, panel, roleId, false);
      if (!modeCheck.allowed) {
        logger.info(`[ReactionRole] User ${user.tag} cannot remove role due to panel mode: ${modeCheck.reason}`);
        // Re-add the reaction since it can't be removed
        try {
          await message.react(reaction.emoji);
        } catch (err) {
          logger.debug('[ReactionRole] Could not re-add reaction');
        }
        // Try to DM the user
        try {
          await user.send(`❌ Cannot remove the role **${role.name}** in **${message.guild.name}**:\n${modeCheck.reason}`);
        } catch (dmErr) {
          logger.debug('[ReactionRole] Could not DM user about removal restriction');
        }
        return;
      }

      // Check if bot has permission to manage this role
      const botMember = message.guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        logger.warn(`Cannot remove role ${role.name} - role is higher than bot's highest role`);
        return;
      }

      await member.roles.remove(roleId);
      logger.info(`[ReactionRole] Removed role ${role.name} (${roleId}) from user ${user.tag} via reaction remove`);

      // Cancel scheduled temporary role removal
      cancelTempRoleRemoval(guildId, user.id, roleId);

      // Send DM notification
      if (panel.dmNotification && panel.dmMessage) {
        await sendDMNotification(user, panel.dmMessage, role, message.guild, false);
      }

      // Log to channel
      if (panel.logChannel) {
        await logRoleChange(message.guild, panel.logChannel, user, role, false, 'reaction');
      }

    } catch (error) {
      logger.error('Error in messageReactionRemove:', error);
    }
  }
};