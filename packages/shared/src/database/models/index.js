const sequelize = require('../index');

const models = {
  License: require('./License')(sequelize),
  Guild: require('./Guild')(sequelize),
  User: require('./User')(sequelize),
  ModerationLog: require('./ModerationLog')(sequelize),
  AutoModViolation: require('./AutoModViolation')(sequelize),
  Warning: require('./Warning')(sequelize),
  Mute: require('./Mute')(sequelize),
  TicketConfig: require('./TicketConfig')(sequelize),
  CommandUsage: require('./CommandUsage')(sequelize),
  CustomCommand: require('./CustomCommand')(sequelize),
  Giveaway: require('./Giveaway')(sequelize),
  UserLevel: require('./UserLevel')(sequelize),
  InviteLog: require('./InviteLog')(sequelize),
  PromoCode: require('./PromoCode')(sequelize),
  Product: require('./Product')(sequelize)
};

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = { sequelize, ...models };
