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
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      logger.info(`[ReactionRole] EVENT TRIGGERED - user: ${user?.tag || user?.id}, bot: ${user?.bot}`);
    } catch (e) {
      logger.error('[ReactionRole] Error in initial log:', e);
    }

    if (user.bot) return;

    // Fetch partials if needed
    try {
      if (reaction.partial) {
        logger.info('[ReactionRole] Fetching partial reaction...');
        await reaction.fetch();
      }
      if (reaction.message.partial) {
        logger.info('[ReactionRole] Fetching partial message...');
        await reaction.message.fetch();
      }
    } catch (error) {
      logger.error('[ReactionRole] Error fetching reaction/message partial:', error);
      return;
    }

    try {
      const { message } = reaction;

      // Skip if no guild (DMs)
      if (!message.guild) return;

      const guildId = message.guild.id;

      logger.info(`[ReactionRole] Reaction added: emoji=${getEmojiIdentifier(reaction.emoji)}, messageId=${message.id}, user=${user.tag}`);

      // Find guild settings and license
      const guildData = await models.Guild.findOne({
        where: { guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guildData) {
        logger.info(`[ReactionRole] No guild data found for ${guildId}`);
        return;
      }

      // Sprawdź czy serwer ma ważną licencję
      if (!guildData.license || !guildData.license.isValid()) {
        logger.info(`[ReactionRole] Guild ${guildId} has no valid license - blocking reaction roles`);
        return;
      }

      if (!guildData.settings || !guildData.settings.reactionRoles) {
        logger.info(`[ReactionRole] No reactionRoles settings for guild ${guildId}`);
        return;
      }

      logger.info(`[ReactionRole] Found ${guildData.settings.reactionRoles.length} reaction panels for guild ${guildId}`);

      // Check if this message is a reaction panel
      const panel = guildData.settings.reactionRoles.find(p => p.messageId === message.id);
      if (!panel) {
        logger.info(`[ReactionRole] Message ${message.id} is not a reaction role panel`);
        return;
      }

      logger.info(`[ReactionRole] Found panel ${panel.id} with ${panel.roles.length} roles`);

      // Find the role associated with the emoji
      logger.info(`[ReactionRole] Looking for emoji: ${getEmojiIdentifier(reaction.emoji)} in stored: ${JSON.stringify(panel.roles.map(r => r.emoji))}`);

      const roleConfig = panel.roles.find(r => matchEmoji(reaction.emoji, r.emoji));

      if (!roleConfig) {
        logger.info(`[ReactionRole] No match for emoji: ${getEmojiIdentifier(reaction.emoji)} on panel ${panel.id}`);
        return;
      }

      logger.info(`[ReactionRole] Matched! emoji=${roleConfig.emoji}, roleId=${roleConfig.roleId}`);

      const roleId = roleConfig.roleId;

      // Validate role exists
      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        logger.warn(`Role ${roleId} not found on server ${guildId}`);
        return;
      }

      const member = await message.guild.members.fetch(user.id);

      // Check if panel is enabled
      if (panel.enabled === false) {
        logger.info(`[ReactionRole] Panel ${panel.id} is disabled`);
        // Remove the reaction since panel is disabled
        try {
          await reaction.users.remove(user.id);
        } catch (err) {
          logger.debug('[ReactionRole] Could not remove reaction from disabled panel');
        }
        return;
      }

      // Import helpers
      const { validatePanelRequirements, checkPanelMode, sendDMNotification, logRoleChange } = require('../utils/reactionRoleHelpers');
      const { scheduleTempRoleRemoval } = require('../utils/tempRoleScheduler');

      // Check if user already has the role
      const isAdding = !member.roles.cache.has(roleId);

      if (isAdding) {
        // Validate panel requirements
        const validation = await validatePanelRequirements(member, panel);
        if (!validation.valid) {
          logger.info(`[ReactionRole] User ${user.tag} failed requirements: ${validation.reason}`);
          // Remove the reaction
          try {
            await reaction.users.remove(user.id);
          } catch (err) {
            logger.debug('[ReactionRole] Could not remove reaction');
          }
          // Try to DM the user
          try {
            await user.send(`❌ Cannot give you the role **${role.name}** in **${message.guild.name}**:\n${validation.reason}`);
          } catch (dmErr) {
            logger.debug('[ReactionRole] Could not DM user about failed requirements');
          }
          return;
        }

        // Check panel mode restrictions
        const modeCheck = checkPanelMode(member, panel, roleId, true);
        if (!modeCheck.allowed) {
          // Single mode: auto-remove other roles from panel
          if (modeCheck.shouldRemoveOthers && panel.panelMode === 'single') {
            const { cancelTempRoleRemoval } = require('../utils/tempRoleScheduler');
            try {
              for (const oldRoleId of modeCheck.rolesToRemove) {
                await member.roles.remove(oldRoleId);
                cancelTempRoleRemoval(guildId, member.id, oldRoleId);
              }
            } catch (err) {
              logger.error('[ReactionRole] Failed to remove old roles in single mode:', err);
            }
          } else {
            logger.info(`[ReactionRole] User ${user.tag} blocked by panel mode: ${modeCheck.reason}`);
            // Remove the reaction
            try {
              await reaction.users.remove(user.id);
            } catch (err) {
              logger.debug('[ReactionRole] Could not remove reaction');
            }
            // Try to DM the user
            try {
              await user.send(`❌ Cannot give you the role **${role.name}** in **${message.guild.name}**:\n${modeCheck.reason}`);
            } catch (dmErr) {
              logger.debug('[ReactionRole] Could not DM user about panel mode restriction');
            }
            return;
          }
        }
      }

      // Check if bot has permission to manage this role
      const botMember = message.guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        logger.warn(`Cannot add role ${role.name} - role is higher than bot's highest role`);
        return;
      }

      if (isAdding) {
        await member.roles.add(roleId);
        logger.info(`[ReactionRole] Added role ${role.name} (${roleId}) to user ${user.tag} via reaction`);

        // Schedule temporary role removal
        if (roleConfig?.tempDurationSeconds && roleConfig.tempDurationSeconds > 0) {
          scheduleTempRoleRemoval(reaction.client, guildId, user.id, roleId, roleConfig.tempDurationSeconds);
        }

        // Send DM notification
        if (panel.dmNotification && panel.dmMessage) {
          await sendDMNotification(user, panel.dmMessage, role, message.guild, true);
        }

        // Log to channel
        if (panel.logChannel) {
          await logRoleChange(message.guild, panel.logChannel, user, role, true, 'reaction');
        }
      }

    } catch (error) {
      logger.error('Error in messageReactionAdd:', error);
    }
  }
};