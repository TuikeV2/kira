const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Guild = sequelize.define('Guild', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    guildId: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      field: 'guild_id'
    },
    guildName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'guild_name'
    },
    licenseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'license_id'
    },
    ownerId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'owner_id'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'joined_at'
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'left_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'guilds',
    timestamps: false,
    indexes: [
      {
        fields: ['license_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Guild.associate = (models) => {
    Guild.belongsTo(models.License, {
      foreignKey: 'license_id',
      as: 'license'
    });
    Guild.hasMany(models.ModerationLog, {
      foreignKey: 'guild_id',
      sourceKey: 'guildId',
      as: 'moderationLogs'
    });
    Guild.hasMany(models.Warning, {
      foreignKey: 'guild_id',
      sourceKey: 'guildId',
      as: 'warnings'
    });
    Guild.hasMany(models.Mute, {
      foreignKey: 'guild_id',
      sourceKey: 'guildId',
      as: 'mutes'
    });
    Guild.hasMany(models.CommandUsage, {
      foreignKey: 'guild_id',
      sourceKey: 'guildId',
      as: 'commandUsage'
    });
  };

  return Guild;
};
