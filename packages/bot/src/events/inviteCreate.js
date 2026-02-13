const { Events } = require('discord.js');
const { addInvite } = require('../utils/inviteCache');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    try {
      addInvite(invite);
      logger.debug(`[InviteCreate] Invite ${invite.code} created by ${invite.inviter?.tag || 'Unknown'}`);
    } catch (error) {
      logger.error('[InviteCreate] Error handling invite create:', error);
    }
  }
};
