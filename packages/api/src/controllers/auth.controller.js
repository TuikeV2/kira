const jwt = require('jsonwebtoken');
const { models } = require('@kira/shared');
const config = require('../config/api.config');
const discordOAuth = require('../utils/discord-oauth');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

// Tymczasowe przechowywanie tokenów dla logowania z aplikacji mobilnej
// Klucz: sessionId, wartość: { token, createdAt }
const appTokenStore = new Map();

// Czyszczenie starych tokenów co 5 minut
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of appTokenStore) {
    if (now - value.createdAt > 5 * 60 * 1000) {
      appTokenStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function initiateDiscordOAuth(req, res) {
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.discord.clientId}&redirect_uri=${encodeURIComponent(config.discord.redirectUri)}&response_type=code&scope=identify%20guilds`;
  res.redirect(authUrl);
}

async function handleDiscordCallback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${config.frontendUrl}/login?error=no_code`);
  }

  try {
    const tokenData = await discordOAuth.exchangeCode(code);
    const userInfo = await discordOAuth.getUserInfo(tokenData.access_token);

    let user = await models.User.findOne({ where: { discordId: userInfo.id } });
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Twoje ID Discord - automatyczne nadanie admina
    const ADMIN_DISCORD_ID = '1067767295373475941';
    const role = userInfo.id === ADMIN_DISCORD_ID ? 'ADMIN' : (user ? user.role : 'USER');

    if (user) {
      await user.update({
        username: userInfo.username,
        discriminator: userInfo.discriminator,
        avatar: userInfo.avatar,
        email: userInfo.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        lastLogin: new Date(),
        role: role // Aktualizacja roli przy każdym logowaniu
      });
    } else {
      user = await models.User.create({
        discordId: userInfo.id,
        username: userInfo.username,
        discriminator: userInfo.discriminator,
        avatar: userInfo.avatar,
        email: userInfo.email,
        role: role,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        lastLogin: new Date()
      });
    }

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        discordId: user.discordId,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const state = req.query.state || '';

    // Logowanie z aplikacji mobilnej: state = "app_SESSIONID"
    if (state.startsWith('app_')) {
      const sessionId = state.substring(4);
      appTokenStore.set(sessionId, { token: jwtToken, createdAt: Date.now() });
      logger.info(`App auth: token stored for session ${sessionId}`);
      return res.redirect(`${config.frontendUrl}/auth/callback?state=${encodeURIComponent(state)}&app=1`);
    }

    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    res.redirect(`${config.frontendUrl}/auth/callback?token=${jwtToken}${stateParam}`);
  } catch (error) {
    logger.error('Discord OAuth callback error:', error);
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await models.User.findByPk(req.user.userId, {
      attributes: ['id', 'discordId', 'username', 'discriminator', 'avatar', 'email', 'role', 'created_at', 'lastLogin']
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', null, 404);
    }

    return ApiResponse.success(res, user);
  } catch (error) {
    logger.error('Get current user error:', error);
    return ApiResponse.error(res, 'Failed to fetch user', null, 500);
  }
}

async function getAppToken(req, res) {
  const { sessionId } = req.params;

  if (!sessionId) {
    return ApiResponse.error(res, 'Session ID required', null, 400);
  }

  const entry = appTokenStore.get(sessionId);
  if (!entry) {
    return ApiResponse.error(res, 'Token not found or expired', null, 404);
  }

  logger.info(`App auth: token retrieved for session ${sessionId}`);
  return ApiResponse.success(res, { token: entry.token });
}

async function logout(req, res) {
  return ApiResponse.success(res, null, 'Logged out successfully');
}

module.exports = {
  initiateDiscordOAuth,
  handleDiscordCallback,
  getCurrentUser,
  getAppToken,
  logout
};