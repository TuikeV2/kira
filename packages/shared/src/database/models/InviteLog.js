const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InviteLog = sequelize.define('InviteLog', {
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
    memberId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'member_id'
    },
    memberTag: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'member_tag'
    },
    inviterId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'inviter_id'
    },
    inviterTag: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'inviter_tag'
    },
    inviteCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'invite_code'
    },
    joinType: {
      type: DataTypes.ENUM('INVITE', 'VANITY', 'UNKNOWN'),
      allowNull: false,
      defaultValue: 'UNKNOWN',
      field: 'join_type'
    },
    accountCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'account_created_at'
    }
  }, {
    tableName: 'invite_logs',
    timestamps: true,
    createdAt: 'joined_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['guild_id']
      },
      {
        fields: ['inviter_id']
      },
      {
        fields: ['joined_at']
      },
      {
        fields: ['invite_code']
      }
    ]
  });

  InviteLog.associate = (models) => {
    InviteLog.belongsTo(models.Guild, {
      foreignKey: 'guild_id',
      targetKey: 'guildId',
      as: 'guild'
    });
  };

  return InviteLog;
};
