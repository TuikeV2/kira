const { EmbedBuilder, ChannelType } = require('discord.js');
const { models } = require('@kira/shared');
const logger = require('./logger');

let clientRef = null;

function getNode() {
  const node = clientRef.shoukaku.options.nodeResolver(clientRef.shoukaku.nodes);
  if (!node) throw new Error('No available Lavalink node');
  return node;
}

async function search(query, source) {
  const node = getNode();
  // Determine search prefix
  let searchQuery = query;
  if (!/^https?:\/\//.test(query)) {
    const prefix = source || 'scsearch';
    searchQuery = `${prefix}:${query}`;
  }
  const result = await node.rest.resolve(searchQuery);
  return result;
}

async function playTrack(guildId, channelId, voiceChannel, track, metadata, volume) {
  const shoukaku = clientRef.shoukaku;
  const queueManager = clientRef.queue;

  let queue = queueManager.get(guildId);
  let player = shoukaku.players.get(guildId);

  if (!player) {
    player = await shoukaku.joinVoiceChannel({
      guildId,
      channelId: voiceChannel.id,
      shardId: 0,
      deaf: false
    });
    setupPlayerEvents(player, guildId);
  }

  if (!queue) {
    queue = queueManager.create(guildId);
    queue.player = player;
    queue.metadata = metadata;
    queue.volume = volume || 50;
  } else {
    queue.metadata = metadata;
  }

  if (!queue.current) {
    // Nothing playing, start immediately
    queue.current = track;
    await player.playTrack({ track: { encoded: track.encoded } });
    const vol = queue.volume / 100;
    await player.setGlobalVolume(Math.round(vol * 100));
  } else {
    // Add to queue
    queue.add(track);
  }

  return { queue, track };
}

function setupPlayerEvents(player, guildId) {
  player.on('start', async () => {
    const queue = clientRef.queue.get(guildId);
    if (!queue || !queue.current) return;

    const track = queue.current;
    try {
      const guildData = await models.Guild.findOne({ where: { guildId } });
      const musicSettings = guildData?.settings?.music;

      if (musicSettings?.announceNowPlaying && queue.metadata?.channel) {
        const embed = new EmbedBuilder()
          .setColor('#7c3aed')
          .setTitle('Teraz gra')
          .setDescription(`**[${track.info.title}](${track.info.uri})**`)
          .addFields(
            { name: 'Autor', value: track.info.author || 'Nieznany', inline: true },
            { name: 'Czas', value: track.info.isStream ? 'Na zywo' : formatDuration(track.info.length), inline: true }
          )
          .setThumbnail(track.info.artworkUrl || null);

        if (track.requestedBy && track.requestedBy.id !== clientRef.user.id) {
          embed.setFooter({
            text: `Dodane przez ${track.requestedBy.username}`,
            iconURL: track.requestedBy.displayAvatarURL()
          });
        }

        await queue.metadata.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error(`Music Announce Error: ${err.message}`);
    }
  });

  player.on('end', async () => {
    const queue = clientRef.queue.get(guildId);
    if (!queue) return;

    const next = queue.skip();
    if (next) {
      await player.playTrack({ track: { encoded: next.encoded } });
    } else {
      // Queue empty
      queue.current = null;
      await handleEmptyQueue(guildId, queue);
    }
  });

  player.on('stuck', async () => {
    logger.warn(`[${guildId}] Player stuck, skipping track`);
    const queue = clientRef.queue.get(guildId);
    if (!queue) return;

    if (queue.metadata?.channel) {
      queue.metadata.channel.send({
        content: 'Track stuck, pomijam...'
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    }

    const next = queue.skip();
    if (next) {
      await player.playTrack({ track: { encoded: next.encoded } });
    } else {
      queue.current = null;
      await handleEmptyQueue(guildId, queue);
    }
  });

  player.on('exception', async (data) => {
    const exMsg = data?.exception?.message || data?.message || 'Unknown error';
    logger.error(`[${guildId}] Player exception: ${exMsg}`);
    const queue = clientRef.queue.get(guildId);
    if (!queue) return;

    if (queue.metadata?.channel) {
      queue.metadata.channel.send({
        content: `Blad strumienia: ${exMsg}. Pomijam...`
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    }

    const next = queue.skip();
    if (next) {
      await player.playTrack({ track: { encoded: next.encoded } });
    } else {
      queue.current = null;
      await handleEmptyQueue(guildId, queue);
    }
  });

  player.on('closed', async (data) => {
    logger.warn(`[${guildId}] Player connection closed: code ${data.code}, reason: ${data.reason}`);
    const queue = clientRef.queue.get(guildId);
    if (queue) {
      // Check if 24/7 mode - attempt reconnect
      try {
        const guildData = await models.Guild.findOne({
          where: { guildId },
          include: [{ model: models.License, as: 'license' }]
        });
        const musicSettings = guildData?.settings?.music;
        if (musicSettings?.enabled && musicSettings?.twentyFourSeven && musicSettings?.voiceChannelId) {
          logger.info(`[${guildId}] 24/7 mode - will reconnect via reconnectAll`);
          clientRef.queue.delete(guildId);
          // Delay reconnect slightly
          setTimeout(() => setupGuild(clientRef, guildId, musicSettings), 3000);
          return;
        }
      } catch (err) {
        logger.error(`[${guildId}] 24/7 reconnect check error: ${err.message}`);
      }
      clientRef.queue.delete(guildId);
    }
  });
}

async function handleEmptyQueue(guildId, queue) {
  try {
    const guildData = await models.Guild.findOne({
      where: { guildId },
      include: [{ model: models.License, as: 'license' }]
    });

    const musicSettings = guildData?.settings?.music;
    if (musicSettings?.enabled && musicSettings?.twentyFourSeven) {
      if (musicSettings.defaultPlaylist) {
        try {
          const result = await search(musicSettings.defaultPlaylist);
          let tracks = [];
          if (result && result.loadType === 'playlist' && result.data?.tracks?.length) {
            tracks = result.data.tracks;
          } else if (result && result.loadType === 'search' && result.data?.length) {
            tracks = [...result.data];
          } else if (result && result.loadType === 'track' && result.data) {
            tracks = [result.data];
          }
          if (tracks.length) {
            // Tag tracks with bot as requester
            for (const t of tracks) {
              t.requestedBy = clientRef.user;
            }
            queue.current = tracks.shift();
            queue.addMany(tracks);
            const player = clientRef.shoukaku.players.get(guildId);
            if (player && queue.current) {
              await player.playTrack({ track: { encoded: queue.current.encoded } });
            }
          }
        } catch (err) {
          logger.error(`Music 24/7 Error: ${err.message}`);
        }
      }
      return; // Stay connected in 24/7 mode
    }

    // Not 24/7 mode - disconnect after empty queue
    const shoukaku = clientRef.shoukaku;
    await shoukaku.leaveVoiceChannel(guildId);
    clientRef.queue.delete(guildId);
  } catch (err) {
    logger.error(`Music Empty Queue Error: ${err.message}`);
  }
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const s = seconds % 60;
  const m = minutes % 60;
  if (hours > 0) {
    return `${hours}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function initMusicManager(client) {
  clientRef = client;

  if (client.isReady()) {
    await reconnectAll(client);
  } else {
    client.once('ready', async () => {
      await reconnectAll(client);
    });
  }
}

async function reconnectAll(client) {
  try {
    const guilds = await models.Guild.findAll({
      include: [{ model: models.License, as: 'license' }]
    });

    for (const guildData of guilds) {
      if (!guildData.license || !guildData.license.isValid()) continue;
      const musicSettings = guildData.settings?.music;
      if (!musicSettings?.enabled || !musicSettings?.twentyFourSeven || !musicSettings.voiceChannelId) continue;

      try {
        await setupGuild(client, guildData.guildId, musicSettings);
      } catch (err) {
        logger.error(`Reconnect Error ${guildData.guildId}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`ReconnectAll Error: ${err.message}`);
  }
}

async function setupGuild(client, guildId, musicSettings) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const voiceChannel = guild.channels.cache.get(musicSettings.voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return;

  const me = guild.members.me;
  if (!me || !voiceChannel.permissionsFor(me).has(['Connect', 'Speak'])) return;

  const requestChannel = musicSettings.requestChannelId ? guild.channels.cache.get(musicSettings.requestChannelId) : null;

  const existingPlayer = client.shoukaku.players.get(guildId);
  if (!existingPlayer && musicSettings.defaultPlaylist) {
    try {
      const result = await search(musicSettings.defaultPlaylist);
      let tracks = [];
      if (result && result.loadType === 'playlist' && result.data?.tracks?.length) {
        tracks = result.data.tracks;
      } else if (result && result.loadType === 'search' && result.data?.length) {
        tracks = [...result.data];
      } else if (result && result.loadType === 'track' && result.data) {
        tracks = [result.data];
      }
      if (tracks.length) {
        for (const t of tracks) {
          t.requestedBy = client.user;
        }
        const firstTrack = tracks.shift();
        const metadata = { channel: requestChannel, requestedBy: client.user };

        const { queue } = await playTrack(guildId, null, voiceChannel, firstTrack, metadata, musicSettings.defaultVolume || 50);
        if (tracks.length) {
          queue.addMany(tracks);
        }
      }
    } catch (err) {
      logger.error(`Default Playlist Error: ${err.message}`);
    }
  } else if (!existingPlayer) {
    // Just join the voice channel without playing anything
    try {
      const player = await client.shoukaku.joinVoiceChannel({
        guildId,
        channelId: voiceChannel.id,
        shardId: 0,
        deaf: false
      });
      setupPlayerEvents(player, guildId);

      const queue = client.queue.create(guildId);
      queue.player = player;
      queue.metadata = { channel: requestChannel, requestedBy: client.user };
    } catch (err) {
      logger.error(`Join Error: ${err.message}`);
    }
  }
}

async function handleMusicRequest(message, guildData) {
  const musicSettings = guildData.settings.music;
  const query = message.content.trim();
  if (!query) return;

  const guild = message.guild;
  const existingQueue = clientRef.queue.get(guild.id);

  if (existingQueue && musicSettings.maxQueueSize && existingQueue.size >= musicSettings.maxQueueSize) {
    const errEmbed = new EmbedBuilder().setColor('#ff0000').setDescription('Kolejka jest pelna!');
    return message.channel.send({ embeds: [errEmbed] }).then(m => {
      setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    });
  }

  let voiceChannel = musicSettings.voiceChannelId ? guild.channels.cache.get(musicSettings.voiceChannelId) : message.member.voice.channel;
  if (!voiceChannel) {
    const errEmbed = new EmbedBuilder().setColor('#ff0000').setDescription('Nie znaleziono kanalu glosowego!');
    return message.channel.send({ embeds: [errEmbed] }).then(m => {
      setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    });
  }

  try {
    const result = await search(query);
    if (!result || result.loadType === 'empty' || result.loadType === 'error') {
      const errEmbed = new EmbedBuilder().setColor('#ff0000').setDescription('Brak wynikow!');
      return message.channel.send({ embeds: [errEmbed] }).then(m => {
        setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
      });
    }

    let tracks;
    if (result.loadType === 'playlist') {
      tracks = result.data.tracks || result.data;
    } else if (result.loadType === 'track') {
      tracks = [result.data];
    } else if (result.loadType === 'search') {
      tracks = [result.data[0]];
    } else {
      const errEmbed = new EmbedBuilder().setColor('#ff0000').setDescription('Brak wynikow!');
      return message.channel.send({ embeds: [errEmbed] }).then(m => {
        setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
      });
    }
    for (const t of tracks) {
      t.requestedBy = message.author;
    }

    const firstTrack = tracks.shift();
    const metadata = { channel: message.channel, requestedBy: message.author };
    const volume = musicSettings.defaultVolume || 50;

    const { queue, track } = await playTrack(guild.id, null, voiceChannel, firstTrack, metadata, volume);
    if (tracks.length) {
      queue.addMany(tracks);
    }

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Dodano do kolejki')
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .setThumbnail(track.info.artworkUrl || null)
      .setFooter({ text: `Przez ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    const reply = await message.channel.send({ embeds: [embed] });
    setTimeout(() => { message.delete().catch(() => {}); reply.delete().catch(() => {}); }, 10000);
  } catch (error) {
    logger.error(`Request Error: ${error.message}`);
    message.channel.send('Wystapil blad podczas proby odtworzenia.');
  }
}

module.exports = { initMusicManager, setupGuild, handleMusicRequest, reconnectAll, search, playTrack, formatDuration };
