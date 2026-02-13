const { models } = require('@kira/shared');

/**
 * Check if a member has DJ role permissions for music commands.
 * Returns true if: no djRoleId set, member has the DJ role, or member has admin permissions.
 */
async function checkDjRole(interaction) {
  try {
    const guildData = await models.Guild.findOne({ where: { guildId: interaction.guild.id } });
    const djRoleId = guildData?.settings?.music?.djRoleId;

    // No DJ role configured = everyone can use music commands
    if (!djRoleId) return true;

    // Admin always has access
    if (interaction.member.permissions.has('Administrator')) return true;

    // Check if member has the DJ role
    return interaction.member.roles.cache.has(djRoleId);
  } catch {
    // If settings can't be loaded, allow the command
    return true;
  }
}

module.exports = checkDjRole;
