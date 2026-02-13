const { CustomCommand } = require('@kira/shared/src/database/models');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

async function getCustomCommands(req, res) {
  try {
    const { guildId } = req.params;

    const commands = await CustomCommand.findAll({
      where: { guildId },
      order: [['created_at', 'DESC']]
    });

    return ApiResponse.success(res, commands);
  } catch (error) {
    logger.error('Get custom commands error:', error);
    return ApiResponse.error(res, 'Failed to fetch custom commands', null, 500);
  }
}

async function createCustomCommand(req, res) {
  try {
    const { guildId } = req.params;
    const {
      commandName, response, embedEnabled, embedTitle, embedColor,
      embedImage, aliases, allowedRoles, isAutoResponse
    } = req.body;

    if (!commandName || !response) {
      return ApiResponse.error(res, 'Command name and response are required', null, 400);
    }

    // Validate command name
    if (commandName.length > 50) {
      return ApiResponse.error(res, 'Command name must be 50 characters or less', null, 400);
    }

    // Validate aliases
    const parsedAliases = aliases ? aliases.filter(a => a && a.trim()).map(a => a.toLowerCase().trim()) : [];
    if (parsedAliases.length > 10) {
      return ApiResponse.error(res, 'Maximum 10 aliases allowed', null, 400);
    }

    // Check if command already exists
    const existing = await CustomCommand.findOne({
      where: { guildId, commandName: commandName.toLowerCase() }
    });

    if (existing) {
      return ApiResponse.error(res, 'A command with this name already exists', null, 409);
    }

    const command = await CustomCommand.create({
      guildId,
      commandName: commandName.toLowerCase(),
      response,
      embedEnabled: embedEnabled || false,
      embedTitle: embedTitle || null,
      embedColor: embedColor || '#5865F2',
      embedImage: embedImage || null,
      aliases: parsedAliases,
      allowedRoles: allowedRoles || [],
      isAutoResponse: isAutoResponse || false,
      createdBy: req.user.userId
    });

    return ApiResponse.success(res, command, 'Custom command created successfully');
  } catch (error) {
    logger.error('Create custom command error:', error);
    return ApiResponse.error(res, 'Failed to create custom command', null, 500);
  }
}

async function updateCustomCommand(req, res) {
  try {
    const { guildId, commandId } = req.params;
    const {
      response, embedEnabled, embedTitle, embedColor,
      embedImage, aliases, allowedRoles, isAutoResponse
    } = req.body;

    const command = await CustomCommand.findOne({
      where: { id: commandId, guildId }
    });

    if (!command) {
      return ApiResponse.error(res, 'Custom command not found', null, 404);
    }

    // Validate aliases if provided
    let parsedAliases = command.aliases;
    if (aliases !== undefined) {
      parsedAliases = aliases ? aliases.filter(a => a && a.trim()).map(a => a.toLowerCase().trim()) : [];
      if (parsedAliases.length > 10) {
        return ApiResponse.error(res, 'Maximum 10 aliases allowed', null, 400);
      }
    }

    await command.update({
      response: response || command.response,
      embedEnabled: embedEnabled !== undefined ? embedEnabled : command.embedEnabled,
      embedTitle: embedTitle !== undefined ? embedTitle : command.embedTitle,
      embedColor: embedColor || command.embedColor,
      embedImage: embedImage !== undefined ? embedImage : command.embedImage,
      aliases: parsedAliases,
      allowedRoles: allowedRoles !== undefined ? allowedRoles : command.allowedRoles,
      isAutoResponse: isAutoResponse !== undefined ? isAutoResponse : command.isAutoResponse
    });

    return ApiResponse.success(res, command, 'Custom command updated successfully');
  } catch (error) {
    logger.error('Update custom command error:', error);
    return ApiResponse.error(res, 'Failed to update custom command', null, 500);
  }
}

async function deleteCustomCommand(req, res) {
  try {
    const { guildId, commandId } = req.params;

    const command = await CustomCommand.findOne({
      where: { id: commandId, guildId }
    });

    if (!command) {
      return ApiResponse.error(res, 'Custom command not found', null, 404);
    }

    await command.destroy();

    return ApiResponse.success(res, null, 'Custom command deleted successfully');
  } catch (error) {
    logger.error('Delete custom command error:', error);
    return ApiResponse.error(res, 'Failed to delete custom command', null, 500);
  }
}

module.exports = {
  getCustomCommands,
  createCustomCommand,
  updateCustomCommand,
  deleteCustomCommand
};
