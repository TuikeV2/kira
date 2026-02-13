const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AutoModViolation = sequelize.define('AutoModViolation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    guildId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'guild_id'
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'user_id'
    },
    violationType: {
      type: DataTypes.ENUM(
        'BANNED_WORD',
        'LINK',
        'DISCORD_INVITE',
        'SPAM_DUPLICATE',
        'SPAM_FLOOD',
        'CAPS_SPAM',
        'EMOJI_SPAM',
        'MENTION_SPAM'
      ),
      allowNull: false,
      field: 'violation_type'
    },
    actionTaken: {
      type: DataTypes.ENUM(
        'DELETE',
        'WARN',
        'MUTE_1H',
        'MUTE_24H',
        'KICK',
        'BAN'
      ),
      allowNull: false,
      field: 'action_taken'
    },
    contentSnippet: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'content_snippet'
    },
    violationCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'violation_count'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    }
  }, {
    tableName: 'automod_violations',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at'
  });

  return AutoModViolation;
};
