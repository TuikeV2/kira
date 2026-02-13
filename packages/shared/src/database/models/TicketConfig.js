const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketConfig = sequelize.define('TicketConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    guildId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'guild_id'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'enabled'
    },
    ticketCategoryId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'ticket_category_id'
    },
    ticketChannelId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'ticket_channel_id'
    },
    panelChannelId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'panel_channel_id'
    },
    panelMessageId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'panel_message_id'
    },
    supportRoleId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'support_role_id'
    },
    supportRoleIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'support_role_ids'
    },
    channelNamePattern: {
      type: DataTypes.STRING,
      defaultValue: 'ticket-{number}',
      field: 'channel_name_pattern'
    },
    logChannelId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'log_channel_id'
    },
    panelTitle: {
      type: DataTypes.STRING,
      defaultValue: 'Centrum Pomocy',
      field: 'panel_title'
    },
    panelDescription: {
      type: DataTypes.TEXT,
      defaultValue: 'Kliknij przycisk poniżej, aby otworzyć zgłoszenie.',
      field: 'panel_description'
    },
    ticketCounter: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'ticket_counter'
    },
    // New: Ticket categories with forms support
    // Structure: [{
    //   id: 'unique-id',
    //   name: 'Support',
    //   description: 'General support tickets',
    //   emoji: '🎫',
    //   color: '#5865F2',
    //   categoryId: 'discord-category-id' (optional, overrides default),
    //   supportRoleIds: ['role-id'] (optional, overrides default),
    //   channelNamePattern: 'support-{number}' (optional),
    //   form: {
    //     enabled: true,
    //     title: 'Support Request',
    //     fields: [
    //       { id: 'subject', label: 'Subject', placeholder: 'Brief description', style: 'short', required: true, minLength: 5, maxLength: 100 },
    //       { id: 'description', label: 'Description', placeholder: 'Detailed description', style: 'paragraph', required: true, minLength: 20, maxLength: 1000 }
    //     ]
    //   }
    // }]
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'categories'
    },
    // Use category select menu instead of single button
    useCategorySelect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'use_category_select'
    }
  }, {
    tableName: 'ticket_configs',
    timestamps: true,
    underscored: true
  });

  TicketConfig.associate = (models) => {
    // Opcjonalnie: Relacja z Guild, jeśli chcesz łączyć tabele
    // TicketConfig.belongsTo(models.Guild, { foreignKey: 'guildId', targetKey: 'guildId' });
  };

  return TicketConfig;
};