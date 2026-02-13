const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    discordId: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      field: 'discord_id'
    },
    username: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    discriminator: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'USER'),
      defaultValue: 'USER',
      allowNull: false
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token'
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'token_expires_at'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_banned'
    },
    banReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'ban_reason'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['role']
      }
    ]
  });

  User.associate = (models) => {
    User.hasMany(models.License, {
      foreignKey: 'created_by_user_id',
      as: 'createdLicenses'
    });
  };

  return User;
};
