const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tier: {
      type: DataTypes.ENUM('PREMIUM', 'VIP'),
      defaultValue: 'VIP'
    },
    duration: {
      type: DataTypes.INTEGER, // in months
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    pricePerMonth: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    maxServers: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    featureLimits: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    savings: {
      type: DataTypes.INTEGER, // percentage or fixed amount
      allowNull: true
    },
    savingsType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      defaultValue: 'fixed'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    stripeProductId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripePriceId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true
  });

  return Product;
};
