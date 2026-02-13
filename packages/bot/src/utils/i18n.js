const { i18n } = require('@kira/shared');
const { models } = require('@kira/shared');

// Re-export core functions from shared
const { t, createTranslator, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = i18n;

/**
 * Get the language for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<string>} Language code
 */
async function getGuildLanguage(guildId) {
  try {
    const guild = await models.Guild.findOne({
      where: { guildId, isActive: true }
    });

    const language = guild?.settings?.language;
    if (language && SUPPORTED_LANGUAGES.includes(language)) {
      return language;
    }
  } catch (error) {
    // Silently fall back to default
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Create a translator function bound to a guild's language
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Function>} Translator function
 */
async function getGuildTranslator(guildId) {
  const language = await getGuildLanguage(guildId);
  return createTranslator(language);
}

/**
 * Translate a key for a specific guild
 * @param {string} guildId - Discord guild ID
 * @param {string} key - Translation key
 * @param {Object} variables - Variables for interpolation
 * @returns {Promise<string>} Translated string
 */
async function tGuild(guildId, key, variables = {}) {
  const language = await getGuildLanguage(guildId);
  return t(key, language, variables);
}

/**
 * Translate a key synchronously (when language is already known)
 * @param {string} key - Translation key
 * @param {string} locale - Language code
 * @param {Object} variables - Variables for interpolation
 * @returns {string} Translated string
 */
function translate(key, locale = DEFAULT_LANGUAGE, variables = {}) {
  return t(key, locale, variables);
}

/**
 * Create a translator from interaction (uses guild settings)
 * @param {Object} interaction - Discord interaction object
 * @returns {Promise<Function>} Translator function
 */
async function getInteractionTranslator(interaction) {
  if (interaction.guildId) {
    return getGuildTranslator(interaction.guildId);
  }
  // For DMs, use default language or user's Discord locale
  const userLocale = interaction.locale?.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(userLocale)) {
    return createTranslator(userLocale);
  }
  return createTranslator(DEFAULT_LANGUAGE);
}

/**
 * Get translated bot responses for a guild
 * Helper to get common bot response translations
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Object with translator and language
 */
async function getBotResponses(guildId) {
  const language = await getGuildLanguage(guildId);
  const translator = createTranslator(language);
  return {
    t: translator,
    language,
    // Common error messages
    errors: {
      noPermission: translator('bot.errors.noPermission'),
      botNoPermission: translator('bot.errors.botNoPermission'),
      invalidUser: translator('bot.errors.invalidUser'),
      commandError: translator('bot.errors.commandError'),
      licenseRequired: translator('bot.errors.licenseRequired')
    }
  };
}

module.exports = {
  t,
  translate,
  tGuild,
  getGuildLanguage,
  getGuildTranslator,
  getInteractionTranslator,
  getBotResponses,
  createTranslator,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
};
