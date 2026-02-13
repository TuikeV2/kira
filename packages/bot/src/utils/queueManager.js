const { EventEmitter } = require('events');

class Queue extends EventEmitter {
  constructor(guildId) {
    super();
    this.guildId = guildId;
    this.tracks = [];
    this.current = null;
    this.volume = 50;
    this.paused = false;
    this.loop = 'off'; // 'off' | 'track' | 'queue'
    this.metadata = null; // { channel, requestedBy }
    this.player = null; // Shoukaku player reference
  }

  add(track) {
    this.tracks.push(track);
  }

  addMany(tracks) {
    this.tracks.push(...tracks);
  }

  skip() {
    if (this.loop === 'track' && this.current) {
      // Re-play the same track
      return this.current;
    }

    if (this.loop === 'queue' && this.current) {
      this.tracks.push(this.current);
    }

    const next = this.tracks.shift() || null;
    this.current = next;
    return next;
  }

  clear() {
    this.tracks = [];
    this.current = null;
    this.paused = false;
  }

  get size() {
    return this.tracks.length;
  }

  get isEmpty() {
    return this.tracks.length === 0 && !this.current;
  }

  get isPlaying() {
    return this.current !== null && !this.paused;
  }

  createProgressBar(position, duration) {
    if (!duration || duration === 0) return '[ LIVE ]';
    const barLength = 15;
    const progress = Math.min(position / duration, 1);
    const filled = Math.round(barLength * progress);
    const empty = barLength - filled;
    const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(empty);
    const posStr = formatTime(position);
    const durStr = formatTime(duration);
    return `${posStr} ${bar} ${durStr}`;
  }
}

function formatTime(ms) {
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

class QueueManager {
  constructor() {
    this.queues = new Map();
  }

  get(guildId) {
    return this.queues.get(guildId) || null;
  }

  create(guildId) {
    if (this.queues.has(guildId)) {
      return this.queues.get(guildId);
    }
    const queue = new Queue(guildId);
    this.queues.set(guildId, queue);
    return queue;
  }

  delete(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.clear();
      queue.removeAllListeners();
    }
    this.queues.delete(guildId);
  }

  has(guildId) {
    return this.queues.has(guildId);
  }
}

module.exports = { QueueManager, Queue, formatTime };
