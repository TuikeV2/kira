const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromoCode = sequelize.define('PromoCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      field: 'discount_type'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'discount_value'
    },
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_uses'
    },
    usedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'used_count'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by_user_id'
    }
  }, {
    tableName: 'promo_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['code']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  PromoCode.associate = (models) => {
    PromoCode.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'creator'
    });
  };

  PromoCode.prototype.isValid = function() {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.maxUses && this.usedCount >= this.maxUses) return false;
    return true;
  };

  return PromoCode;
};
