const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomCommand = sequelize.define('CustomCommand', {
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
    commandName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'command_name'
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'response'
    },
    embedEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'embed_enabled'
    },
    embedTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'embed_title'
    },
    embedColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#5865F2',
      field: 'embed_color'
    },
    embedImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'embed_image'
    },
    aliases: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'aliases'
    },
    allowedRoles: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'allowed_roles'
    },
    isAutoResponse: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_auto_response'
    },
    createdBy: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'created_by'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'usage_count'
    }
  }, {
    tableName: 'custom_commands',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['guild_id', 'command_name']
      }
    ]
  });

  CustomCommand.associate = (models) => {
    // CustomCommand.belongsTo(models.Guild, { foreignKey: 'guildId', targetKey: 'guildId' });
  };

  return CustomCommand;
};
