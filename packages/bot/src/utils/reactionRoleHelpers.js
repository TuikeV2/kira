const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

/**
 * Validate if user meets panel requirements
 * @param {GuildMember} member - Discord member
 * @param {Object} panel - Panel settings
 * @returns {Object} { valid: boolean, reason: string }
 */
async function validatePanelRequirements(member, panel) {
  const userRoleIds = Array.from(member.roles.cache.keys());

  // Check required roles
  if (panel.requiredRoles && panel.requiredRoles.length > 0) {
    const hasRequired = panel.requiredRoles.some(roleId => userRoleIds.includes(roleId));
    if (!hasRequired) {
      const roleNames = panel.requiredRoles
        .map(id => member.guild.roles.cache.get(id)?.name || 'Unknown')
        .join(', ');
      return {
        valid: false,
        reason: `You need one of these roles: **${roleNames}**`
      };
    }
  }

  // Check forbidden roles
  if (panel.forbiddenRoles && panel.forbiddenRoles.length > 0) {
    const hasForbidden = panel.forbiddenRoles.some(roleId => userRoleIds.includes(roleId));
    if (hasForbidden) {
      return {
        valid: false,
        reason: 'You have a role that is not allowed to use this panel.'
      };
    }
  }

  // Check minimum account age
  if (panel.minAccountAge && panel.minAccountAge > 0) {
    const accountAgeDays = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < panel.minAccountAge) {
      return {
        valid: false,
        reason: `Your Discord account must be at least **${panel.minAccountAge} days** old. (Yours: ${accountAgeDays} days)`
      };
    }
  }

  // Check minimum server time
  if (panel.minServerTime && panel.minServerTime > 0) {
    const serverTimeDays = Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (serverTimeDays < panel.minServerTime) {
      return {
        valid: false,
        reason: `You must be on this server for at least **${panel.minServerTime} days**. (Yours: ${serverTimeDays} days)`
      };
    }
  }

  return { valid: true };
}

/**
 * Check panel mode restrictions
 * @param {GuildMember} member - Discord member
 * @param {Object} panel - Panel settings
 * @param {string} requestedRoleId - Role being requested
 * @param {boolean} isAdding - True if adding role, false if removing
 * @returns {Object} { allowed: boolean, reason: string }
 */
function checkPanelMode(member, panel, requestedRoleId, isAdding) {
  const panelRoleIds = panel.roles.map(r => r.roleId);
  const userPanelRoles = panelRoleIds.filter(roleId => member.roles.cache.has(roleId));

  // VERIFY mode - one-time only, cannot remove
  if (panel.panelMode === 'verify') {
    if (!isAdding && userPanelRoles.includes(requestedRoleId)) {
      return {
        allowed: false,
        reason: 'This is a verification role and cannot be removed.'
      };
    }
    if (isAdding && userPanelRoles.length > 0) {
      return {
        allowed: false,
        reason: 'You have already verified. This panel can only be used once.'
      };
    }
  }

  // SINGLE mode - only one role at a time
  if (panel.panelMode === 'single' && isAdding) {
    if (userPanelRoles.length > 0 && !userPanelRoles.includes(requestedRoleId)) {
      const currentRole = member.guild.roles.cache.get(userPanelRoles[0]);
      return {
        allowed: false,
        reason: `You can only have one role from this panel. Remove **${currentRole?.name || 'your current role'}** first.`,
        shouldRemoveOthers: true,
        rolesToRemove: userPanelRoles
      };
    }
  }

  // LIMITED mode - max X roles
  if (panel.panelMode === 'limited' && isAdding) {
    const maxRoles = panel.maxRoles || 1;
    if (!userPanelRoles.includes(requestedRoleId) && userPanelRoles.length >= maxRoles) {
      return {
        allowed: false,
        reason: `You can only have **${maxRoles}** role${maxRoles > 1 ? 's' : ''} from this panel.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Send DM notification to user
 * @param {User} user - Discord user
 * @param {string} message - Message template
 * @param {Role} role - Role object
 * @param {Guild} guild - Guild object
 * @param {boolean} added - True if role was added, false if removed
 */
async function sendDMNotification(user, message, role, guild, added) {
  try {
    let finalMessage = message
      .replace(/{role}/g, role.name)
      .replace(/{user}/g, user.username)
      .replace(/{server}/g, guild.name);

    if (!message.includes('{role}') && !message.includes('{user}')) {
      finalMessage = `You have been ${added ? 'given' : 'removed from'} the role: **${role.name}** in **${guild.name}**`;
    }

    await user.send(finalMessage);
    logger.debug(`[ReactionRole] Sent DM to ${user.tag}`);
  } catch (err) {
    logger.debug(`[ReactionRole] Could not send DM to ${user.tag}: ${err.message}`);
  }
}

/**
 * Log role change to log channel
 * @param {Guild} guild - Discord guild
 * @param {string} logChannelId - Log channel ID
 * @param {User} user - User who got the role
 * @param {Role} role - Role object
 * @param {boolean} added - True if added, false if removed
 * @param {string} method - 'reaction' or 'button'
 */
async function logRoleChange(guild, logChannelId, user, role, added, method = 'reaction') {
  if (!logChannelId) return;

  try {
    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${added ? '✅' : '❌'} Role ${added ? 'Added' : 'Removed'}`)
      .setColor(added ? '#57F287' : '#ED4245')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Role', value: `${role.name}`, inline: true },
        { name: 'Method', value: method === 'button' ? 'Button' : 'Reaction', inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
    logger.debug(`[ReactionRole] Logged role change to #${logChannel.name}`);
  } catch (err) {
    logger.error(`[ReactionRole] Failed to log to channel:`, err);
  }
}

module.exports = {
  validatePanelRequirements,
  checkPanelMode,
  sendDMNotification,
  logRoleChange
};
