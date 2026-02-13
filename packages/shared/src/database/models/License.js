const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const License = sequelize.define('License', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    licenseKey: {
      type: DataTypes.STRING(64),
      unique: true,
      allowNull: false,
      field: 'license_key'
    },
    tier: {
      type: DataTypes.ENUM('FREE', 'PREMIUM', 'VIP'),
      defaultValue: 'FREE',
      allowNull: false
    },
    maxServers: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      field: 'max_servers'
    },
    createdByUserId: {
      type: DataTypes.INTEGER, // ZMIANA: Typ INTEGER pasujący do User.id
      allowNull: true,
      field: 'created_by_user_id'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active'
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_verified_at'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'licenses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['tier']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  License.associate = (models) => {
    License.hasMany(models.Guild, {
      foreignKey: 'license_id',
      as: 'guilds'
    });
    // ZMIANA: Usunięto targetKey, aby domyślnie łączyło po ID (PK)
    License.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'creator'
    });
  };

  License.prototype.isValid = function() {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  };

  License.prototype.canAddServer = async function() {
    const activeGuilds = await this.countGuilds({
      where: { is_active: true }
    });
    return this.maxServers === -1 || activeGuilds < this.maxServers;
  };

  return License;
};