const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Warning = sequelize.define('Warning', {
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'warnings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['guild_id', 'user_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Warning.associate = (models) => {
    Warning.belongsTo(models.Guild, {
      foreignKey: 'guild_id',
      targetKey: 'guildId',
      as: 'guild'
    });
  };

  return Warning;
};
