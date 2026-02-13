const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'kira',
  process.env.DB_USER || 'kira_user',
  process.env.DB_PASSWORD || 'kira_password_change_me',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mariadb',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      timezone: '+00:00',
      connectTimeout: 10000
    }
  }
);

module.exports = sequelize;
