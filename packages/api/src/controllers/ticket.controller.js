const { TicketConfig } = require('@kira/shared/src/database/models');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');

async function getTicketConfig(req, res) {
  try {
    const { guildId } = req.params;

    const [config, created] = await TicketConfig.findOrCreate({
      where: { guildId: guildId },
      defaults: {
        guildId: guildId,
        enabled: false,
        categories: [],
        useCategorySelect: false
      }
    });

    return ApiResponse.success(res, config);
  } catch (error) {
    logger.error('Get ticket config error:', error);
    return ApiResponse.error(res, 'Failed to fetch ticket configuration', null, 500);
  }
}

async function updateTicketConfig(req, res) {
  try {
    const { guildId } = req.params;
    const updateData = req.body;

    const config = await TicketConfig.findOne({ where: { guildId } });

    if (!config) {
        const newConfig = await TicketConfig.create({ ...updateData, guildId });
        return ApiResponse.success(res, newConfig, 'Ticket configuration created successfully');
    }

    await config.update(updateData);

    return ApiResponse.success(res, config, 'Ticket configuration updated successfully');
  } catch (error) {
    logger.error('Update ticket config error:', error);
    return ApiResponse.error(res, 'Failed to update ticket configuration', null, 500);
  }
}

async function getGuildChannels(req, res) {
  try {
    const { guildId } = req.params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      logger.error('Bot token not configured');
      return ApiResponse.error(res, 'Bot configuration error', null, 500);
    }

    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    logger.info(`Fetched ${response.data.length} channels for guild ${guildId}`);

    const channels = response.data
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parentId: channel.parent_id,
        permissionOverwrites: channel.permission_overwrites
      }))
      .sort((a, b) => {
         if (a.type === 4 && b.type !== 4) return -1;
         if (a.type !== 4 && b.type === 4) return 1;
         return a.position - b.position;
      });

    return ApiResponse.success(res, channels);
  } catch (error) {
    logger.error(`Get guild channels error for ${req.params.guildId}:`, error.message);
    if (error.response && error.response.status === 404) {
        return ApiResponse.error(res, 'Bot is not on this server (Check Bot Invite)', null, 404);
    }
    return ApiResponse.error(res, 'Failed to fetch channels from Discord', null, 500);
  }
}

async function getGuildRoles(req, res) {
    try {
      const { guildId } = req.params;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );

      logger.info(`Fetched ${response.data.length} roles for guild ${guildId}`);

      const roles = response.data
        .map(role => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            managed: role.managed
        }))
        .sort((a, b) => b.position - a.position);

      return ApiResponse.success(res, roles);
    } catch (error) {
      logger.error('Get guild roles error:', error);
      return ApiResponse.error(res, 'Failed to fetch roles', null, 500);
    }
}

async function sendTicketPanel(req, res) {
  try {
    const { guildId } = req.params;
    const { channelId, mode } = req.body;

    if (!channelId) {
      return ApiResponse.error(res, 'Channel ID is required', null, 400);
    }

    const config = await TicketConfig.findOne({ where: { guildId } });

    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const categories = config.categories || [];
    const panelMode = mode || 'single';

    let description = config.panelDescription || 'Kliknij przycisk poniżej, aby otworzyć zgłoszenie.';
    let components = [];

    if ((panelMode === 'buttons' || panelMode === 'select') && categories.length > 0) {
      description += '\n\n**Dostępne kategorie:**';
      for (const cat of categories) {
        description += `\n${cat.emoji || '📨'} **${cat.name}**`;
        if (cat.description) {
          description += ` - ${cat.description}`;
        }
      }
    }

    const embed = {
      title: config.panelTitle || 'Centrum Pomocy',
      description: description,
      color: 0x5865F2,
      footer: {
        text: 'KiraEvo Ticket System'
      }
    };

    if (panelMode === 'buttons' && categories.length > 0) {
      // Multiple buttons for each category
      const rows = [];
      let currentRow = { type: 1, components: [] };

      for (let i = 0; i < Math.min(categories.length, 25); i++) {
        const cat = categories[i];
        const button = {
          type: 2,
          style: 1,
          label: cat.name,
          custom_id: `ticket_cat_${cat.id}`
        };
        if (cat.emoji) {
          // Check if it's a custom emoji (contains :)
          if (cat.emoji.includes(':')) {
            const match = cat.emoji.match(/<?(a)?:?(\w+):(\d+)>?/);
            if (match) {
              button.emoji = { name: match[2], id: match[3], animated: !!match[1] };
            }
          } else {
            button.emoji = { name: cat.emoji };
          }
        }
        currentRow.components.push(button);

        if ((i + 1) % 5 === 0 || i === categories.length - 1) {
          rows.push(currentRow);
          currentRow = { type: 1, components: [] };
        }
      }
      components = rows;

    } else if (panelMode === 'select' && categories.length > 0) {
      // Select menu
      const selectMenu = {
        type: 1,
        components: [{
          type: 3, // String Select
          custom_id: 'ticket_category_select',
          placeholder: 'Wybierz kategorię zgłoszenia...',
          options: categories.slice(0, 25).map(cat => {
            const option = {
              label: cat.name,
              value: cat.id,
              description: cat.description?.substring(0, 100) || `Otwórz zgłoszenie: ${cat.name}`
            };
            if (cat.emoji) {
              if (cat.emoji.includes(':')) {
                const match = cat.emoji.match(/<?(a)?:?(\w+):(\d+)>?/);
                if (match) {
                  option.emoji = { name: match[2], id: match[3], animated: !!match[1] };
                }
              } else {
                option.emoji = { name: cat.emoji };
              }
            }
            return option;
          })
        }]
      };
      components = [selectMenu];
      await config.update({ useCategorySelect: true });

    } else {
      // Single button (default)
      const button = {
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: 'Otwórz Zgłoszenie',
          custom_id: 'create_ticket',
          emoji: { name: '🎫' }
        }]
      };
      components = [button];

      // Enable category select if categories exist
      if (categories.length > 0) {
        await config.update({ useCategorySelect: true });
      }
    }

    const response = await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        embeds: [embed],
        components: components
      },
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    await config.update({
      panelChannelId: channelId,
      panelMessageId: response.data.id
    });

    return ApiResponse.success(res, { messageId: response.data.id }, 'Ticket panel sent successfully');
  } catch (error) {
    logger.error('Send ticket panel error:', error.response?.data || error.message);
    return ApiResponse.error(res, 'Failed to send ticket panel', error.response?.data, 500);
  }
}

// ============ CATEGORY MANAGEMENT ============

async function addCategory(req, res) {
  try {
    const { guildId } = req.params;
    const { name, description, emoji, color, categoryId, supportRoleIds, channelNamePattern } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'Category name is required', null, 400);
    }

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];

    const newCategory = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      description: description || null,
      emoji: emoji || null,
      color: color || '#5865F2',
      categoryId: categoryId || null,
      supportRoleIds: supportRoleIds || [],
      channelNamePattern: channelNamePattern || null,
      form: {
        enabled: false,
        title: `${name} - Formularz`,
        fields: []
      }
    };

    categories.push(newCategory);
    await config.update({ categories });

    logger.info(`Added ticket category "${name}" for guild ${guildId}`);
    return ApiResponse.success(res, newCategory, 'Category added successfully');
  } catch (error) {
    logger.error('Add category error:', error);
    return ApiResponse.error(res, 'Failed to add category', null, 500);
  }
}

async function updateCategory(req, res) {
  try {
    const { guildId, categoryId } = req.params;
    const updateData = req.body;

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];
    const catIndex = categories.findIndex(c => c.id === categoryId);

    if (catIndex === -1) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    // Update category fields (preserve form if not provided)
    categories[catIndex] = {
      ...categories[catIndex],
      ...updateData,
      id: categoryId, // Preserve ID
      form: updateData.form || categories[catIndex].form // Preserve form
    };

    await config.update({ categories });

    logger.info(`Updated ticket category "${categoryId}" for guild ${guildId}`);
    return ApiResponse.success(res, categories[catIndex], 'Category updated successfully');
  } catch (error) {
    logger.error('Update category error:', error);
    return ApiResponse.error(res, 'Failed to update category', null, 500);
  }
}

async function deleteCategory(req, res) {
  try {
    const { guildId, categoryId } = req.params;

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];
    const catIndex = categories.findIndex(c => c.id === categoryId);

    if (catIndex === -1) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    const removed = categories.splice(catIndex, 1)[0];
    await config.update({ categories });

    logger.info(`Deleted ticket category "${removed.name}" for guild ${guildId}`);
    return ApiResponse.success(res, { deleted: removed.name }, 'Category deleted successfully');
  } catch (error) {
    logger.error('Delete category error:', error);
    return ApiResponse.error(res, 'Failed to delete category', null, 500);
  }
}

// ============ FORM MANAGEMENT ============

async function updateCategoryForm(req, res) {
  try {
    const { guildId, categoryId } = req.params;
    const { enabled, title, fields } = req.body;

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];
    const catIndex = categories.findIndex(c => c.id === categoryId);

    if (catIndex === -1) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    if (!categories[catIndex].form) {
      categories[catIndex].form = { enabled: false, title: '', fields: [] };
    }

    if (enabled !== undefined) categories[catIndex].form.enabled = enabled;
    if (title !== undefined) categories[catIndex].form.title = title;
    if (fields !== undefined) {
      // Validate max 5 fields
      if (fields.length > 5) {
        return ApiResponse.error(res, 'Maximum 5 fields allowed per form', null, 400);
      }
      categories[catIndex].form.fields = fields;
    }

    await config.update({ categories });

    logger.info(`Updated form for category "${categoryId}" in guild ${guildId}`);
    return ApiResponse.success(res, categories[catIndex].form, 'Form updated successfully');
  } catch (error) {
    logger.error('Update form error:', error);
    return ApiResponse.error(res, 'Failed to update form', null, 500);
  }
}

async function addFormField(req, res) {
  try {
    const { guildId, categoryId } = req.params;
    const { id, label, style, required, placeholder, minLength, maxLength } = req.body;

    if (!id || !label || !style) {
      return ApiResponse.error(res, 'Field id, label and style are required', null, 400);
    }

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];
    const catIndex = categories.findIndex(c => c.id === categoryId);

    if (catIndex === -1) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    if (!categories[catIndex].form) {
      categories[catIndex].form = { enabled: false, title: '', fields: [] };
    }

    if (categories[catIndex].form.fields.length >= 5) {
      return ApiResponse.error(res, 'Maximum 5 fields allowed per form', null, 400);
    }

    // Check for duplicate ID
    if (categories[catIndex].form.fields.some(f => f.id === id)) {
      return ApiResponse.error(res, 'Field with this ID already exists', null, 400);
    }

    const newField = {
      id,
      label,
      style, // 'short' or 'paragraph'
      required: required !== false,
      placeholder: placeholder || null,
      minLength: minLength || null,
      maxLength: maxLength || null
    };

    categories[catIndex].form.fields.push(newField);
    await config.update({ categories });

    logger.info(`Added form field "${label}" to category "${categoryId}" in guild ${guildId}`);
    return ApiResponse.success(res, newField, 'Field added successfully');
  } catch (error) {
    logger.error('Add form field error:', error);
    return ApiResponse.error(res, 'Failed to add form field', null, 500);
  }
}

async function deleteFormField(req, res) {
  try {
    const { guildId, categoryId, fieldId } = req.params;

    const config = await TicketConfig.findOne({ where: { guildId } });
    if (!config) {
      return ApiResponse.error(res, 'Ticket configuration not found', null, 404);
    }

    const categories = config.categories || [];
    const catIndex = categories.findIndex(c => c.id === categoryId);

    if (catIndex === -1) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    if (!categories[catIndex].form?.fields) {
      return ApiResponse.error(res, 'No form fields exist', null, 404);
    }

    const fieldIndex = categories[catIndex].form.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) {
      return ApiResponse.error(res, 'Field not found', null, 404);
    }

    const removed = categories[catIndex].form.fields.splice(fieldIndex, 1)[0];
    await config.update({ categories });

    logger.info(`Deleted form field "${removed.label}" from category "${categoryId}" in guild ${guildId}`);
    return ApiResponse.success(res, { deleted: removed.label }, 'Field deleted successfully');
  } catch (error) {
    logger.error('Delete form field error:', error);
    return ApiResponse.error(res, 'Failed to delete form field', null, 500);
  }
}

module.exports = {
  getTicketConfig,
  updateTicketConfig,
  getGuildChannels,
  getGuildRoles,
  sendTicketPanel,
  addCategory,
  updateCategory,
  deleteCategory,
  updateCategoryForm,
  addFormField,
  deleteFormField
};