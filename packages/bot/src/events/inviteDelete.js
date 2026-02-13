const { Events } = require('discord.js');
const { removeInvite } = require('../utils/inviteCache');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InviteDelete,
  async execute(invite) {
    try {
      removeInvite(invite);
      logger.debug(`[InviteDelete] Invite ${invite.code} deleted`);
    } catch (error) {
      logger.error('[InviteDelete] Error handling invite delete:', error);
    }
  }
};
