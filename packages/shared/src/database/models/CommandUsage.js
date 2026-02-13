const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommandUsage = sequelize.define('CommandUsage', {
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
    commandName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'command_name'
    },
    executedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'executed_at'
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    }
  }, {
    tableName: 'command_usage',
    timestamps: false,
    indexes: [
      {
        fields: ['guild_id']
      },
      {
        fields: ['command_name']
      },
      {
        fields: ['executed_at']
      }
    ]
  });

  CommandUsage.associate = (models) => {
    CommandUsage.belongsTo(models.Guild, {
      foreignKey: 'guild_id',
      targetKey: 'guildId',
      as: 'guild'
    });
  };

  return CommandUsage;
};
