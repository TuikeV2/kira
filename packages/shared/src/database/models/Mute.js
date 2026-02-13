const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mute = sequelize.define('Mute', {
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
    moderatorId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'moderator_id'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mutedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'muted_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    unmutedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'unmuted_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'mutes',
    timestamps: false,
    indexes: [
      {
        fields: ['guild_id', 'user_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  Mute.associate = (models) => {
    Mute.belongsTo(models.Guild, {
      foreignKey: 'guild_id',
      targetKey: 'guildId',
      as: 'guild'
    });
  };

  return Mute;
};
