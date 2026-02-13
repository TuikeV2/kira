const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModerationLog = sequelize.define('ModerationLog', {
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
    actionType: {
      type: DataTypes.ENUM('MUTE', 'UNMUTE', 'WARN', 'CLEAR', 'AUTOMOD_WARN', 'AUTOMOD_MUTE', 'AUTOMOD_KICK', 'AUTOMOD_BAN'),
      allowNull: false,
      field: 'action_type'
    },
    moderatorId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'moderator_id'
    },
    targetId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'target_id'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'moderation_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['guild_id']
      },
      {
        fields: ['action_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  ModerationLog.associate = (models) => {
    ModerationLog.belongsTo(models.Guild, {
      foreignKey: 'guild_id',
      targetKey: 'guildId',
      as: 'guild'
    });
  };

  return ModerationLog;
};
