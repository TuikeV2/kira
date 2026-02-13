const axios = require('axios');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const BOT_INTERNAL_URL = process.env.BOT_INTERNAL_URL || 'http://localhost:3002';
const BOT_API_SECRET = process.env.BOT_API_SECRET;

async function botRequest(method, path, data = null) {
  const config = {
    method,
    url: `${BOT_INTERNAL_URL}${path}`,
    headers: { 'X-Internal-Secret': BOT_API_SECRET },
    timeout: 10000
  };
  if (data) {
    config.data = data;
  }
  return axios(config);
}

const getStatus = async (req, res) => {
  try {
    const { guildId } = req.params;
    const response = await botRequest('get', `/music/${guildId}/status`);
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    logger.error('Music getStatus error:', error.message);
    return ApiResponse.error(res, 'Failed to get music status', null, 500);
  }
};

const getQueue = async (req, res) => {
  try {
    const { guildId } = req.params;
    const response = await botRequest('get', `/music/${guildId}/queue`);
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    logger.error('Music getQueue error:', error.message);
    return ApiResponse.error(res, 'Failed to get queue', null, 500);
  }
};

const play = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { query, voiceChannelId } = req.body;

    if (!query) {
      return ApiResponse.error(res, 'Query is required', null, 400);
    }
    if (!voiceChannelId) {
      return ApiResponse.error(res, 'Voice channel ID is required', null, 400);
    }

    const response = await botRequest('post', `/music/${guildId}/play`, { query, voiceChannelId });
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to play', null, error.response.status);
    }
    logger.error('Music play error:', error.message);
    return ApiResponse.error(res, 'Failed to play track', null, 500);
  }
};

const pause = async (req, res) => {
  try {
    const { guildId } = req.params;
    const response = await botRequest('post', `/music/${guildId}/pause`);
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to pause', null, error.response.status);
    }
    logger.error('Music pause error:', error.message);
    return ApiResponse.error(res, 'Failed to toggle pause', null, 500);
  }
};

const skip = async (req, res) => {
  try {
    const { guildId } = req.params;
    const response = await botRequest('post', `/music/${guildId}/skip`);
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to skip', null, error.response.status);
    }
    logger.error('Music skip error:', error.message);
    return ApiResponse.error(res, 'Failed to skip track', null, 500);
  }
};

const stop = async (req, res) => {
  try {
    const { guildId } = req.params;
    const response = await botRequest('post', `/music/${guildId}/stop`);
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to stop', null, error.response.status);
    }
    logger.error('Music stop error:', error.message);
    return ApiResponse.error(res, 'Failed to stop playback', null, 500);
  }
};

const setVolume = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { volume } = req.body;

    if (volume === undefined || volume < 0 || volume > 100) {
      return ApiResponse.error(res, 'Volume must be between 0 and 100', null, 400);
    }

    const response = await botRequest('post', `/music/${guildId}/volume`, { volume });
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to set volume', null, error.response.status);
    }
    logger.error('Music setVolume error:', error.message);
    return ApiResponse.error(res, 'Failed to set volume', null, 500);
  }
};

const removeTrack = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { index } = req.body;

    if (index === undefined) {
      return ApiResponse.error(res, 'Track index is required', null, 400);
    }

    const response = await botRequest('post', `/music/${guildId}/remove`, { index });
    return ApiResponse.success(res, response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return ApiResponse.error(res, 'Bot is not running or internal API is unavailable', null, 503);
    }
    if (error.response) {
      return ApiResponse.error(res, error.response.data?.error || 'Failed to remove track', null, error.response.status);
    }
    logger.error('Music removeTrack error:', error.message);
    return ApiResponse.error(res, 'Failed to remove track', null, 500);
  }
};

module.exports = {
  getStatus,
  getQueue,
  play,
  pause,
  skip,
  stop,
  setVolume,
  removeTrack
};
