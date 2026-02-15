const axios = require('axios');
const config = require('../config/api.config');

const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.discord.redirectUri
  });

  const response = await axios.post(
    `${DISCORD_API_BASE}/oauth2/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

async function getUserInfo(accessToken) {
  const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

async function getUserGuilds(accessToken) {
  const response = await axios.get(`${DISCORD_API_BASE}/users/@me/guilds?with_counts=true`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await axios.post(
    `${DISCORD_API_BASE}/oauth2/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

module.exports = {
  exchangeCode,
  getUserInfo,
  getUserGuilds,
  refreshAccessToken
};
