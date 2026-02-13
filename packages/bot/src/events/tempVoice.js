const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('../utils/logger');

// Track active temp channels: channelId -> { ownerId, guildId, deleteTimeout }
const activeTempChannels = new Map();

// Track temp channel count per guild for {count} variable
const guildChannelCount = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;

    try {
      const guildData = await models.Guild.findOne({
        where: { guildId, isActive: true },
        include: [{ model: models.License, as: 'license' }]
      });

      if (!guildData || !guildData.license?.isValid()) return;

      const tempVoice = guildData.settings?.tempVoice;
      if (!tempVoice?.enabled || !tempVoice.creatorChannelId) return;

      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      // User joined a channel (from nothing)
      if (!oldChannelId && newChannelId) {
        if (newChannelId === tempVoice.creatorChannelId) {
          await createTempChannel(member, newState, tempVoice);
        }
      }
      // User left a channel (to nothing)
      else if (oldChannelId && !newChannelId) {
        handleChannelLeave(oldState, oldChannelId);
      }
      // User switched channels
      else if (oldChannelId !== newChannelId) {
        // Handle leaving old temp channel
        handleChannelLeave(oldState, oldChannelId);

        // Handle joining creator channel
        if (newChannelId === tempVoice.creatorChannelId) {
          await createTempChannel(member, newState, tempVoice);
        }
        // Handle joining an existing temp channel (cancel its delete timeout)
        else if (activeTempChannels.has(newChannelId)) {
          const data = activeTempChannels.get(newChannelId);
          if (data.deleteTimeout) {
            clearTimeout(data.deleteTimeout);
            data.deleteTimeout = null;
            logger.debug(`[TempVoice] Cancelled delete timeout for channel ${newChannelId}`);
          }
        }
      }
    } catch (error) {
      logger.error(`[TempVoice] Error in voiceStateUpdate:`, error);
    }
  }
};

function handleChannelLeave(state, channelId) {
  if (!activeTempChannels.has(channelId)) return;

  const channel = state.guild.channels.cache.get(channelId);
  if (!channel) {
    // Channel no longer exists, clean up
    activeTempChannels.delete(channelId);
    return;
  }

  // Check if channel is now empty
  if (channel.members.size === 0) {
    const data = activeTempChannels.get(channelId);

    // Don't start a new timeout if one is already running
    if (data.deleteTimeout) return;

    const deleteAfter = (data.deleteAfterSeconds ?? 30) * 1000;

    if (deleteAfter <= 0) {
      // Immediate deletion
      deleteChannel(channel, channelId);
    } else {
      data.deleteTimeout = setTimeout(() => {
        // Re-check if still empty before deleting
        const freshChannel = state.guild.channels.cache.get(channelId);
        if (!freshChannel || freshChannel.members.size === 0) {
          deleteChannel(freshChannel || channel, channelId);
        } else {
          // Someone joined while we waited, clear the reference
          const d = activeTempChannels.get(channelId);
          if (d) d.deleteTimeout = null;
        }
      }, deleteAfter);
      logger.debug(`[TempVoice] Started ${data.deleteAfterSeconds}s delete timer for channel ${channelId}`);
    }
  }
}

async function deleteChannel(channel, channelId) {
  try {
    activeTempChannels.delete(channelId);
    if (channel && channel.deletable) {
      await channel.delete('Temp voice channel empty');
      logger.info(`[TempVoice] Deleted temp channel ${channel.name} (${channelId})`);
    }
  } catch (error) {
    logger.error(`[TempVoice] Failed to delete channel ${channelId}:`, error);
  }
}

async function createTempChannel(member, state, tempVoice) {
  const guild = state.guild;

  try {
    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels) ||
        !botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
      logger.warn(`[TempVoice] Missing ManageChannels or MoveMembers permission in ${guild.name}`);
      return;
    }

    // Increment channel count for this guild
    const count = (guildChannelCount.get(guild.id) || 0) + 1;
    guildChannelCount.set(guild.id, count);

    // Build channel name from template
    const nameTemplate = tempVoice.nameTemplate || '\u{1F50A} Kana\u0142 {user}';
    const channelName = nameTemplate
      .replace(/{user}/g, member.user.displayName || member.user.username)
      .replace(/{username}/g, member.user.username)
      .replace(/{count}/g, count.toString());

    // Build channel options
    const channelOptions = {
      name: channelName,
      type: ChannelType.GuildVoice,
      reason: `Temp voice channel for ${member.user.tag}`,
    };

    if (tempVoice.categoryId) {
      channelOptions.parent = tempVoice.categoryId;
    }

    if (tempVoice.userLimit && tempVoice.userLimit > 0) {
      channelOptions.userLimit = tempVoice.userLimit;
    }

    if (tempVoice.bitrate && tempVoice.bitrate >= 8000) {
      channelOptions.bitrate = Math.min(tempVoice.bitrate, guild.maximumBitrate);
    }

    const newChannel = await guild.channels.create(channelOptions);

    // Track the new temp channel
    activeTempChannels.set(newChannel.id, {
      ownerId: member.id,
      guildId: guild.id,
      deleteAfterSeconds: tempVoice.deleteAfterSeconds ?? 30,
      deleteTimeout: null
    });

    // Move the user to the new channel
    await member.voice.setChannel(newChannel, 'Moved to temp voice channel');

    logger.info(`[TempVoice] Created temp channel "${channelName}" for ${member.user.tag} in ${guild.name}`);
  } catch (error) {
    logger.error(`[TempVoice] Failed to create temp channel for ${member.user.tag}:`, error);
  }
}

// Cleanup function for graceful shutdown
module.exports.cleanup = () => {
  for (const [channelId, data] of activeTempChannels.entries()) {
    if (data.deleteTimeout) {
      clearTimeout(data.deleteTimeout);
    }
  }
  activeTempChannels.clear();
  guildChannelCount.clear();
};
