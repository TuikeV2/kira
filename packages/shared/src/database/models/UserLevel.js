const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserLevel = sequelize.define('UserLevel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    discordId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'discord_id'
    },
    guildId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'guild_id'
    },
    xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalMessages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_messages'
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_message_at'
    }
  }, {
    tableName: 'user_levels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['discord_id', 'guild_id']
      },
      {
        fields: ['guild_id']
      },
      {
        fields: ['level']
      },
      {
        fields: ['xp']
      }
    ]
  });

  // Metoda do obliczania XP wymaganego na następny poziom
  UserLevel.getRequiredXp = (level) => {
    // Formuła: 100 * (level + 1)^2
    return 100 * Math.pow(level + 1, 2);
  };

  // Metoda do obliczania poziomu na podstawie XP
  UserLevel.getLevelFromXp = (xp) => {
    // Odwrotność formuły: level = sqrt(xp / 100) - 1
    let level = 0;
    let totalXpRequired = 0;

    while (totalXpRequired + UserLevel.getRequiredXp(level) <= xp) {
      totalXpRequired += UserLevel.getRequiredXp(level);
      level++;
    }

    return level;
  };

  // Metoda instancji do obliczania progresu
  UserLevel.prototype.getProgress = function() {
    let totalXpForCurrentLevel = 0;
    for (let i = 0; i < this.level; i++) {
      totalXpForCurrentLevel += UserLevel.getRequiredXp(i);
    }

    const currentLevelXp = this.xp - totalXpForCurrentLevel;
    const requiredXp = UserLevel.getRequiredXp(this.level);

    return {
      currentXp: currentLevelXp,
      requiredXp: requiredXp,
      percentage: Math.floor((currentLevelXp / requiredXp) * 100)
    };
  };

  return UserLevel;
};
