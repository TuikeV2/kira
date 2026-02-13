const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Giveaway = sequelize.define('Giveaway', {
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
    channelId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'channel_id'
    },
    messageId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'message_id'
    },
    prize: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'prize'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
    },
    winners: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'winners'
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ends_at'
    },
    createdBy: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'created_by'
    },
    participants: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'participants'
    },
    winnersList: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'winners_list'
    },
    winnerIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'winner_ids'
    },
    status: {
      type: DataTypes.ENUM('active', 'ended', 'cancelled', 'paused'),
      defaultValue: 'active',
      field: 'status'
    },
    // Requirements
    requiredRole: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'required_role'
    },
    requiredRoles: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'required_roles'
    },
    requiredRolesType: {
      type: DataTypes.ENUM('any', 'all'),
      defaultValue: 'any',
      field: 'required_roles_type'
    },
    blacklistedRoles: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'blacklisted_roles'
    },
    minAccountAge: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_account_age'
    },
    minServerTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_server_time'
    },
    minLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_level'
    },
    minMessages: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_messages'
    },
    // Bonus entries
    bonusEntries: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'bonus_entries'
    },
    // Customization
    embedColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#9333ea',
      field: 'embed_color'
    },
    embedImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'embed_image'
    },
    embedThumbnail: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'embed_thumbnail'
    },
    // Winner settings
    dmWinners: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'dm_winners'
    },
    winnerMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'winner_message'
    },
    // Drop giveaway (first X to click wins)
    isDropGiveaway: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_drop_giveaway'
    },
    // Pause info
    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paused_at'
    },
    pausedTimeRemaining: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'paused_time_remaining'
    }
  }, {
    tableName: 'giveaways',
    timestamps: true,
    underscored: true
  });

  Giveaway.associate = (models) => {
    Giveaway.belongsTo(models.Guild, { foreignKey: 'guildId', targetKey: 'guildId' });
  };

  return Giveaway;
};
