const { PermissionsBitField } = require('discord.js');
const { AutoModViolation, ModerationLog, Warning } = require('@kira/shared/src/database/models');
const logger = require('./logger');

// ============================================================================
// IN-MEMORY TRACKING
// ============================================================================

// Map<guildId_userId, Array<{content, timestamp}>>
const messageHistory = new Map();

// Map<guildId_userId, {count, timestamp}>
const violationCounts = new Map();

// Cleanup old data every 5 minutes
setInterval(() => {
  const now = Date.now();
  const retentionTime = 60 * 1000; // 1 minute

  // Cleanup message history
  for (const [key, messages] of messageHistory.entries()) {
    const filtered = messages.filter(msg => now - msg.timestamp < retentionTime);
    if (filtered.length === 0) {
      messageHistory.delete(key);
    } else {
      messageHistory.set(key, filtered);
    }
  }

  // Cleanup violation counts cache
  for (const [key, data] of violationCounts.entries()) {
    if (now - data.timestamp > retentionTime) {
      violationCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect banned words in message content
 * @param {string} content - Message content
 * @param {string[]} bannedWords - Array of banned words
 * @returns {Object|null} - Violation object or null
 */
function detectBannedWords(content, bannedWords) {
  if (!bannedWords || bannedWords.length === 0) return null;

  const lowerContent = content.toLowerCase();
  for (const word of bannedWords) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        violation: 'BANNED_WORD',
        reason: `Message contains banned word: "${word}"`
      };
    }
  }
  return null;
}

/**
 * Detect links in message content
 * @param {string} content - Message content
 * @returns {Object|null} - Violation object or null
 */
function detectLinks(content) {
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = content.match(linkRegex);

  if (matches && matches.length > 0) {
    return {
      violation: 'LINK',
      reason: `Message contains link: ${matches[0]}`
    };
  }
  return null;
}

/**
 * Detect Discord invite links
 * @param {string} content - Message content
 * @returns {Object|null} - Violation object or null
 */
function detectDiscordInvites(content) {
  const inviteRegex = /(discord\.(gg|io|me|li)|discord\.com\/invite)/gi;
  const matches = content.match(inviteRegex);

  if (matches && matches.length > 0) {
    return {
      violation: 'DISCORD_INVITE',
      reason: 'Message contains Discord invite link'
    };
  }
  return null;
}

/**
 * Detect duplicate message spam
 * @param {Message} message - Discord message
 * @param {Object} settings - Automod settings
 * @returns {Object|null} - Violation object or null
 */
function detectDuplicateSpam(message, settings) {
  const { duplicateTimeWindow = 30000, duplicateMaxCount = 3 } = settings;
  const key = `${message.guild.id}_${message.author.id}`;
  const now = Date.now();

  const history = messageHistory.get(key) || [];
  const recentMessages = history.filter(msg => now - msg.timestamp < duplicateTimeWindow);

  // Count identical messages
  const duplicates = recentMessages.filter(msg => msg.content === message.content);

  if (duplicates.length >= duplicateMaxCount - 1) { // -1 because current message not yet added
    return {
      violation: 'SPAM_DUPLICATE',
      reason: `Sent ${duplicateMaxCount} identical messages in ${duplicateTimeWindow / 1000}s`
    };
  }
  return null;
}

/**
 * Detect message flood spam
 * @param {Message} message - Discord message
 * @param {Object} settings - Automod settings
 * @returns {Object|null} - Violation object or null
 */
function detectMessageFlood(message, settings) {
  const { floodTimeWindow = 5000, floodMaxMessages = 5 } = settings;
  const key = `${message.guild.id}_${message.author.id}`;
  const now = Date.now();

  const history = messageHistory.get(key) || [];
  const recentMessages = history.filter(msg => now - msg.timestamp < floodTimeWindow);

  if (recentMessages.length >= floodMaxMessages - 1) { // -1 because current message not yet added
    return {
      violation: 'SPAM_FLOOD',
      reason: `Sent ${floodMaxMessages} messages in ${floodTimeWindow / 1000}s`
    };
  }
  return null;
}

/**
 * Detect excessive caps spam
 * @param {string} content - Message content
 * @param {Object} settings - Automod settings
 * @returns {Object|null} - Violation object or null
 */
function detectCapsSpam(content, settings) {
  const { capsPercentage = 70, capsMinLength = 10 } = settings;

  if (content.length < capsMinLength) return null;

  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return null;

  const upperCount = content.replace(/[^A-Z]/g, '').length;
  const percentage = (upperCount / letters.length) * 100;

  if (percentage >= capsPercentage) {
    return {
      violation: 'CAPS_SPAM',
      reason: `Message is ${Math.round(percentage)}% uppercase (threshold: ${capsPercentage}%)`
    };
  }
  return null;
}

/**
 * Detect excessive emoji spam
 * @param {string} content - Message content
 * @param {Object} settings - Automod settings
 * @returns {Object|null} - Violation object or null
 */
function detectEmojiSpam(content, settings) {
  const { maxEmojis = 10 } = settings;

  // Count Unicode emojis
  const unicodeEmojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const unicodeMatches = content.match(unicodeEmojiRegex) || [];

  // Count custom Discord emojis <:name:id> or <a:name:id>
  const customEmojiRegex = /<a?:\w+:\d+>/g;
  const customMatches = content.match(customEmojiRegex) || [];

  const totalEmojis = unicodeMatches.length + customMatches.length;

  if (totalEmojis > maxEmojis) {
    return {
      violation: 'EMOJI_SPAM',
      reason: `Message contains ${totalEmojis} emojis (max: ${maxEmojis})`
    };
  }
  return null;
}

/**
 * Detect excessive mention spam
 * @param {Message} message - Discord message
 * @param {Object} settings - Automod settings
 * @returns {Object|null} - Violation object or null
 */
function detectMentionSpam(message, settings) {
  const { maxMentions = 5, blockEveryoneHere = true } = settings;

  // Check @everyone and @here
  if (blockEveryoneHere && (message.mentions.everyone || message.content.includes('@here'))) {
    return {
      violation: 'MENTION_SPAM',
      reason: 'Message contains @everyone or @here'
    };
  }

  // Count user and role mentions
  const totalMentions = message.mentions.users.size + message.mentions.roles.size;

  if (totalMentions > maxMentions) {
    return {
      violation: 'MENTION_SPAM',
      reason: `Message contains ${totalMentions} mentions (max: ${maxMentions})`
    };
  }
  return null;
}

// ============================================================================
// VIOLATION TRACKING
// ============================================================================

/**
 * Get violation count for a user in a guild within decay period
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {number} decayHours - Hours to look back
 * @returns {Promise<number>} - Violation count
 */
async function getViolationCount(guildId, userId, decayHours = 24) {
  try {
    const cutoffDate = new Date(Date.now() - decayHours * 60 * 60 * 1000);

    const count = await AutoModViolation.count({
      where: {
        guildId,
        userId,
        createdAt: {
          [require('sequelize').Op.gte]: cutoffDate
        }
      }
    });

    return count;
  } catch (error) {
    logger.error('Error getting violation count:', error);
    return 0;
  }
}

/**
 * Increment cached violation count
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {number} - New count
 */
function incrementViolationCache(guildId, userId) {
  const key = `${guildId}_${userId}`;
  const cached = violationCounts.get(key);

  if (cached) {
    cached.count += 1;
    cached.timestamp = Date.now();
    violationCounts.set(key, cached);
    return cached.count;
  } else {
    violationCounts.set(key, { count: 1, timestamp: Date.now() });
    return 1;
  }
}

/**
 * Track message in history
 * @param {Message} message - Discord message
 */
function trackMessage(message) {
  const key = `${message.guild.id}_${message.author.id}`;
  const history = messageHistory.get(key) || [];

  history.push({
    content: message.content,
    timestamp: Date.now()
  });

  // Keep only last 20 messages
  if (history.length > 20) {
    history.shift();
  }

  messageHistory.set(key, history);
}

// ============================================================================
// PUNISHMENT EXECUTION
// ============================================================================

/**
 * Execute punishment based on violation count
 * @param {Message} message - Discord message
 * @param {number} violationCount - Current violation count
 * @param {Object} settings - Automod settings
 * @returns {Promise<Object>} - Action taken {action, duration}
 */
async function executePunishment(message, violationCount, settings) {
  const { escalation } = settings;

  if (!escalation || !escalation.enabled) {
    return { action: 'DELETE', duration: null };
  }

  const member = message.member;
  if (!member) {
    return { action: 'DELETE', duration: null };
  }

  try {
    // Determine action based on thresholds
    if (escalation.ban && violationCount >= escalation.ban) {
      await member.ban({ reason: `AutoMod: ${violationCount} violations` });
      return { action: 'BAN', duration: null };
    }

    if (escalation.kick && violationCount >= escalation.kick) {
      await member.kick(`AutoMod: ${violationCount} violations`);
      return { action: 'KICK', duration: null };
    }

    if (escalation.mute24h && violationCount >= escalation.mute24h) {
      const duration = 24 * 60 * 60 * 1000; // 24 hours in ms
      await member.timeout(duration, `AutoMod: ${violationCount} violations`);
      return { action: 'MUTE_24H', duration: '24h' };
    }

    if (escalation.mute1h && violationCount >= escalation.mute1h) {
      const duration = 60 * 60 * 1000; // 1 hour in ms
      await member.timeout(duration, `AutoMod: ${violationCount} violations`);
      return { action: 'MUTE_1H', duration: '1h' };
    }

    if (escalation.warn && violationCount >= escalation.warn) {
      await Warning.create({
        guildId: message.guild.id,
        userId: message.author.id,
        moderatorId: message.client.user.id,
        reason: `AutoMod: Violation #${violationCount}`
      });
      return { action: 'WARN', duration: null };
    }

    return { action: 'DELETE', duration: null };
  } catch (error) {
    logger.error('Error executing punishment:', error);
    return { action: 'DELETE', duration: null };
  }
}

// ============================================================================
// DATABASE LOGGING
// ============================================================================

/**
 * Log violation to database
 * @param {Message} message - Discord message
 * @param {string} violationType - Type of violation
 * @param {string} actionTaken - Action taken
 * @param {number} violationCount - Current violation count
 * @param {string} reason - Violation reason
 * @param {number} decayHours - Decay hours for expiration
 */
async function logViolation(message, violationType, actionTaken, violationCount, reason, decayHours) {
  try {
    // Create AutoModViolation record
    const expiresAt = new Date(Date.now() + decayHours * 60 * 60 * 1000);

    await AutoModViolation.create({
      guildId: message.guild.id,
      userId: message.author.id,
      violationType,
      actionTaken,
      contentSnippet: message.content.substring(0, 500),
      violationCount,
      expiresAt
    });

    // Create ModerationLog for escalated actions (WARN and above)
    if (['WARN', 'MUTE_1H', 'MUTE_24H', 'KICK', 'BAN'].includes(actionTaken)) {
      const actionTypeMap = {
        'WARN': 'AUTOMOD_WARN',
        'MUTE_1H': 'AUTOMOD_MUTE',
        'MUTE_24H': 'AUTOMOD_MUTE',
        'KICK': 'AUTOMOD_KICK',
        'BAN': 'AUTOMOD_BAN'
      };

      await ModerationLog.create({
        guildId: message.guild.id,
        actionType: actionTypeMap[actionTaken],
        moderatorId: message.client.user.id,
        targetId: message.author.id,
        reason,
        metadata: {
          violationType,
          violationCount,
          channel: message.channel.id,
          messageContent: message.content.substring(0, 500)
        }
      });
    }
  } catch (error) {
    logger.error('Error logging violation:', error);
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Check message for automod violations
 * @param {Message} message - Discord message
 * @param {Object} guildData - Guild data with settings
 */
async function checkMessage(message, guildData) {
  // Skip if automod disabled
  const settings = guildData?.settings?.automod;
  if (!settings || !settings.enabled) {
    return;
  }

  // Skip bots
  if (message.author.bot) {
    return;
  }

  // Skip if no member (DM or member left)
  if (!message.member) {
    return;
  }

  // Bypass for administrators and users with MANAGE_MESSAGES permission
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return;
  }

  // Track message for spam detection
  trackMessage(message);

  // Run detection functions in priority order
  let violation = null;

  // 1. Spam detection (highest priority)
  if (settings.antiSpamDuplicate) {
    violation = detectDuplicateSpam(message, settings);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  if (settings.antiSpamFlood) {
    violation = detectMessageFlood(message, settings);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  // 2. Content filters
  if (settings.antiCaps) {
    violation = detectCapsSpam(message.content, settings);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  if (settings.antiEmoji) {
    violation = detectEmojiSpam(message.content, settings);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  if (settings.antiMention) {
    violation = detectMentionSpam(message, settings);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  // 3. Link filters
  if (settings.blockDiscordInvites) {
    violation = detectDiscordInvites(message.content);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  if (settings.blockLinks) {
    violation = detectLinks(message.content);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }

  // 4. Banned words (lowest priority)
  if (settings.bannedWords && settings.bannedWords.length > 0) {
    violation = detectBannedWords(message.content, settings.bannedWords);
    if (violation) {
      await handleViolation(message, violation, settings);
      return;
    }
  }
}

/**
 * Handle detected violation
 * @param {Message} message - Discord message
 * @param {Object} violation - Violation object {violation, reason}
 * @param {Object} settings - Automod settings
 */
async function handleViolation(message, violation, settings) {
  try {
    // Get violation count from database
    const decayHours = settings.violationDecayHours || 24;
    const dbCount = await getViolationCount(message.guild.id, message.author.id, decayHours);
    const violationCount = dbCount + 1;

    // Increment cache
    incrementViolationCache(message.guild.id, message.author.id);

    // Execute punishment
    const punishment = await executePunishment(message, violationCount, settings);

    // Log to database
    await logViolation(
      message,
      violation.violation,
      punishment.action,
      violationCount,
      violation.reason,
      decayHours
    );

    // Delete message
    try {
      await message.delete();
    } catch (error) {
      logger.error('Error deleting message:', error);
    }

    // Send notification
    const actionText = punishment.duration
      ? `${punishment.action.toLowerCase().replace('_', ' ')} (${punishment.duration})`
      : punishment.action.toLowerCase();

    const notificationMsg = await message.channel.send({
      content: `⚠️ ${message.author}, your message was removed by AutoMod. **Reason:** ${violation.reason}\n**Action:** ${actionText} (Violation #${violationCount})`
    });

    // Auto-delete notification after 8 seconds
    setTimeout(() => {
      notificationMsg.delete().catch(() => {});
    }, 8000);

  } catch (error) {
    logger.error('Error handling violation:', error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  checkMessage,
  // Export detection functions for testing
  detectBannedWords,
  detectLinks,
  detectDiscordInvites,
  detectDuplicateSpam,
  detectMessageFlood,
  detectCapsSpam,
  detectEmojiSpam,
  detectMentionSpam
};
