const express = require('express');
const { ChannelType } = require('discord.js');
const { search, playTrack, formatDuration } = require('./utils/musicManager');
const logger = require('./utils/logger');

function startInternalApi(client) {
  const app = express();
  const port = process.env.BOT_API_PORT || 3002;
  const secret = process.env.BOT_API_SECRET;

  app.use(express.json());

  // Auth middleware
  app.use((req, res, next) => {
    if (!secret) {
      return res.status(500).json({ error: 'BOT_API_SECRET not configured' });
    }
    const provided = req.headers['x-internal-secret'];
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // GET /music/:guildId/status
  app.get('/music/:guildId/status', (req, res) => {
    const { guildId } = req.params;
    const queue = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);

    if (!queue || !queue.current) {
      return res.json({
        playing: false,
        track: null,
        queueSize: queue ? queue.size : 0,
        volume: queue ? queue.volume : 50,
        paused: false,
        voiceChannelId: null,
        position: 0,
        duration: 0
      });
    }

    const track = queue.current;
    return res.json({
      playing: true,
      track: {
        title: track.info.title,
        author: track.info.author,
        uri: track.info.uri,
        artworkUrl: track.info.artworkUrl || null,
        duration: track.info.length,
        durationFormatted: formatDuration(track.info.length),
        isStream: track.info.isStream,
        requestedBy: track.requestedBy ? track.requestedBy.username : null
      },
      queueSize: queue.size,
      volume: queue.volume,
      paused: queue.paused,
      voiceChannelId: player ? player.connection?.channelId : null,
      position: player ? player.position : 0,
      duration: track.info.length || 0
    });
  });

  // GET /music/:guildId/queue
  app.get('/music/:guildId/queue', (req, res) => {
    const { guildId } = req.params;
    const queue = client.queue.get(guildId);

    if (!queue) {
      return res.json({ tracks: [] });
    }

    const tracks = queue.tracks.map((track, index) => ({
      index,
      title: track.info.title,
      author: track.info.author,
      uri: track.info.uri,
      artworkUrl: track.info.artworkUrl || null,
      duration: track.info.length,
      durationFormatted: formatDuration(track.info.length),
      requestedBy: track.requestedBy ? track.requestedBy.username : null
    }));

    return res.json({ tracks });
  });

  // POST /music/:guildId/play
  app.post('/music/:guildId/play', async (req, res) => {
    const { guildId } = req.params;
    const { query, voiceChannelId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    if (!voiceChannelId) {
      return res.status(400).json({ error: 'Voice channel ID is required' });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const voiceChannel = guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      return res.status(400).json({ error: 'Invalid voice channel' });
    }

    try {
      const result = await search(query);
      if (!result || result.loadType === 'empty' || result.loadType === 'error') {
        return res.status(404).json({ error: 'No results found' });
      }

      let tracks;
      if (result.loadType === 'playlist') {
        tracks = result.data.tracks || result.data;
      } else if (result.loadType === 'track') {
        tracks = [result.data];
      } else if (result.loadType === 'search') {
        tracks = [result.data[0]];
      } else {
        return res.status(404).json({ error: 'No results found' });
      }

      for (const t of tracks) {
        t.requestedBy = client.user;
      }

      const firstTrack = tracks.shift();
      const metadata = { channel: null, requestedBy: client.user };

      const { queue, track } = await playTrack(guildId, null, voiceChannel, firstTrack, metadata, 50);
      if (tracks.length) {
        queue.addMany(tracks);
      }

      return res.json({
        success: true,
        track: {
          title: track.info.title,
          author: track.info.author,
          uri: track.info.uri,
          artworkUrl: track.info.artworkUrl || null,
          duration: track.info.length,
          durationFormatted: formatDuration(track.info.length)
        },
        queueSize: queue.size
      });
    } catch (error) {
      logger.error(`Internal API play error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to play track' });
    }
  });

  // POST /music/:guildId/pause
  app.post('/music/:guildId/pause', async (req, res) => {
    const { guildId } = req.params;
    const queue = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);

    if (!queue || !player || !queue.current) {
      return res.status(400).json({ error: 'Nothing is playing' });
    }

    queue.paused = !queue.paused;
    await player.setPaused(queue.paused);

    return res.json({ paused: queue.paused });
  });

  // POST /music/:guildId/skip
  app.post('/music/:guildId/skip', async (req, res) => {
    const { guildId } = req.params;
    const queue = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);

    if (!queue || !player || !queue.current) {
      return res.status(400).json({ error: 'Nothing is playing' });
    }

    await player.stopTrack();

    return res.json({ success: true });
  });

  // POST /music/:guildId/stop
  app.post('/music/:guildId/stop', async (req, res) => {
    const { guildId } = req.params;
    const queue = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);

    if (!queue) {
      return res.json({ success: true });
    }

    queue.clear();
    if (player) {
      await player.stopTrack();
      await client.shoukaku.leaveVoiceChannel(guildId);
    }
    client.queue.delete(guildId);

    return res.json({ success: true });
  });

  // POST /music/:guildId/volume
  app.post('/music/:guildId/volume', async (req, res) => {
    const { guildId } = req.params;
    const { volume } = req.body;

    if (volume === undefined || volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'Volume must be between 0 and 100' });
    }

    const queue = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);

    if (!queue || !player) {
      return res.status(400).json({ error: 'No active player' });
    }

    queue.volume = volume;
    await player.setGlobalVolume(volume);

    return res.json({ volume });
  });

  // POST /music/:guildId/remove
  app.post('/music/:guildId/remove', (req, res) => {
    const { guildId } = req.params;
    const { index } = req.body;

    const queue = client.queue.get(guildId);
    if (!queue) {
      return res.status(400).json({ error: 'No active queue' });
    }

    if (index === undefined || index < 0 || index >= queue.tracks.length) {
      return res.status(400).json({ error: 'Invalid track index' });
    }

    const removed = queue.tracks.splice(index, 1)[0];

    return res.json({
      success: true,
      removed: {
        title: removed.info.title,
        author: removed.info.author
      }
    });
  });

  // GET /music/:guildId/voice-channels
  app.get('/music/:guildId/voice-channels', (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const voiceChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildVoice)
      .map(c => ({ id: c.id, name: c.name }));

    return res.json({ channels: voiceChannels });
  });

  app.listen(port, '0.0.0.0', () => {
    logger.info(`Bot internal API running on port ${port}`);
  });
}

module.exports = { startInternalApi };
