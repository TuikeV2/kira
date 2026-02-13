const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { Giveaway, UserLevel } = require('@kira/shared/src/database/models');
const { Op } = require('sequelize');

// Helper to parse duration string
function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return amount * multipliers[unit];
}

// Helper to build giveaway embed
function buildGiveawayEmbed(giveaway, isEnded = false, winners = []) {
  const color = giveaway.embedColor || '#9333ea';

  if (isEnded) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Ended 🎉')
      .setColor(winners.length > 0 ? '#57F287' : '#ED4245')
      .setFooter({ text: 'Ended' })
      .setTimestamp();

    if (winners.length > 0) {
      embed.setDescription(`**Prize:** ${giveaway.prize}\n\n**${winners.length === 1 ? 'Winner' : 'Winners'}:**\n${winners.map(w => `<@${w}>`).join(', ')}`);
    } else {
      embed.setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No valid entries! No winners could be determined.`);
    }

    if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
    if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

    return embed;
  }

  const embed = new EmbedBuilder()
    .setTitle(giveaway.isDropGiveaway ? '🎁 DROP GIVEAWAY 🎁' : '🎉 GIVEAWAY 🎉')
    .setDescription(`**Prize:** ${giveaway.prize}\n\n${giveaway.description || 'Click the button below to enter!'}`)
    .setColor(color)
    .setFooter({ text: `${giveaway.winners} winner(s) | ${giveaway.status === 'paused' ? 'PAUSED' : 'Ends'}` })
    .setTimestamp(giveaway.status === 'paused' ? null : new Date(giveaway.endsAt));

  const fields = [
    { name: 'Winners', value: `${giveaway.winners}`, inline: true },
    { name: giveaway.status === 'paused' ? 'Status' : 'Ends At', value: giveaway.status === 'paused' ? '⏸️ Paused' : `<t:${Math.floor(new Date(giveaway.endsAt).getTime() / 1000)}:R>`, inline: true },
    { name: 'Hosted By', value: `<@${giveaway.createdBy}>`, inline: true }
  ];

  if (giveaway.isDropGiveaway) {
    fields.push({ name: 'Type', value: '🎁 First to click wins!', inline: false });
  }

  // Requirements
  const requirements = [];
  if (giveaway.requiredRole) {
    requirements.push(`• Role: <@&${giveaway.requiredRole}>`);
  }
  if (giveaway.requiredRoles?.length > 0) {
    const rolesText = giveaway.requiredRoles.map(r => `<@&${r}>`).join(', ');
    requirements.push(`• Roles (${giveaway.requiredRolesType}): ${rolesText}`);
  }
  if (giveaway.blacklistedRoles?.length > 0) {
    const rolesText = giveaway.blacklistedRoles.map(r => `<@&${r}>`).join(', ');
    requirements.push(`• Blocked roles: ${rolesText}`);
  }
  if (giveaway.minAccountAge) {
    requirements.push(`• Min account age: ${giveaway.minAccountAge} days`);
  }
  if (giveaway.minServerTime) {
    requirements.push(`• Min server time: ${giveaway.minServerTime} days`);
  }
  if (giveaway.minLevel) {
    requirements.push(`• Min level: ${giveaway.minLevel}`);
  }
  if (giveaway.minMessages) {
    requirements.push(`• Min messages: ${giveaway.minMessages}`);
  }

  if (requirements.length > 0) {
    fields.push({ name: '📋 Requirements', value: requirements.join('\n'), inline: false });
  }

  // Bonus entries
  if (giveaway.bonusEntries?.length > 0) {
    const bonusText = giveaway.bonusEntries.map(b => `<@&${b.roleId}>: +${b.entries} entries`).join('\n');
    fields.push({ name: '⭐ Bonus Entries', value: bonusText, inline: false });
  }

  embed.addFields(fields);

  if (giveaway.embedImage) embed.setImage(giveaway.embedImage);
  if (giveaway.embedThumbnail) embed.setThumbnail(giveaway.embedThumbnail);

  return embed;
}

// Helper to build button
function buildGiveawayButton(disabled = false, participantCount = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(`Enter Giveaway${participantCount > 0 ? ` (${participantCount})` : ''}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉')
      .setDisabled(disabled)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // CREATE subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new giveaway')
        .addStringOption(option =>
          option.setName('prize')
            .setDescription('What are you giving away?')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('How long? (e.g., 1h, 2d, 30m)')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Giveaway description'))
        .addStringOption(option =>
          option.setName('required-roles')
            .setDescription('Required role IDs (comma-separated)'))
        .addStringOption(option =>
          option.setName('roles-type')
            .setDescription('How to check required roles')
            .addChoices(
              { name: 'Any role', value: 'any' },
              { name: 'All roles', value: 'all' }
            ))
        .addStringOption(option =>
          option.setName('blacklisted-roles')
            .setDescription('Blocked role IDs (comma-separated)'))
        .addIntegerOption(option =>
          option.setName('min-account-age')
            .setDescription('Minimum Discord account age in days')
            .setMinValue(1))
        .addIntegerOption(option =>
          option.setName('min-server-time')
            .setDescription('Minimum time on server in days')
            .setMinValue(1))
        .addIntegerOption(option =>
          option.setName('min-level')
            .setDescription('Minimum user level')
            .setMinValue(1))
        .addIntegerOption(option =>
          option.setName('min-messages')
            .setDescription('Minimum message count')
            .setMinValue(1))
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Embed color (hex, e.g., #FF5733)'))
        .addStringOption(option =>
          option.setName('image')
            .setDescription('Embed image URL'))
        .addStringOption(option =>
          option.setName('thumbnail')
            .setDescription('Embed thumbnail URL'))
        .addBooleanOption(option =>
          option.setName('dm-winners')
            .setDescription('Send DM to winners (default: true)'))
        .addStringOption(option =>
          option.setName('winner-message')
            .setDescription('Custom DM message for winners'))
        .addBooleanOption(option =>
          option.setName('drop')
            .setDescription('Drop giveaway mode (first X to click win immediately)'))
        .addStringOption(option =>
          option.setName('bonus-entries')
            .setDescription('Bonus entries: roleId:entries,roleId:entries (e.g., 123:2,456:3)'))
    )
    // END subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End a giveaway early')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
    )
    // REROLL subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll winners for a giveaway')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Number of new winners to pick')
            .setMinValue(1)
            .setMaxValue(20))
    )
    // PAUSE subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('pause')
        .setDescription('Pause an active giveaway')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
    )
    // RESUME subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('resume')
        .setDescription('Resume a paused giveaway')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
    )
    // LIST subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List giveaways')
        .addStringOption(option =>
          option.setName('status')
            .setDescription('Filter by status')
            .addChoices(
              { name: 'Active', value: 'active' },
              { name: 'Paused', value: 'paused' },
              { name: 'Ended', value: 'ended' },
              { name: 'All', value: 'all' }
            ))
    )
    // INFO subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get details about a giveaway')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
    )
    // CANCEL subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel a giveaway')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Giveaway ID')
            .setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        return handleCreate(interaction);
      case 'end':
        return handleEnd(interaction);
      case 'reroll':
        return handleReroll(interaction);
      case 'pause':
        return handlePause(interaction);
      case 'resume':
        return handleResume(interaction);
      case 'list':
        return handleList(interaction);
      case 'info':
        return handleInfo(interaction);
      case 'cancel':
        return handleCancel(interaction);
      default:
        return interaction.reply({ content: '❌ Unknown subcommand', ephemeral: true });
    }
  }
};

async function handleCreate(interaction) {
  try {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnersCount = interaction.options.getInteger('winners');
    const description = interaction.options.getString('description') || 'Click the button below to enter!';

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.reply({
        content: '❌ Invalid duration format! Use: 30s, 5m, 2h, or 1d',
        ephemeral: true
      });
    }

    const endsAt = new Date(Date.now() + duration);

    // Parse required roles
    const requiredRolesStr = interaction.options.getString('required-roles');
    const requiredRoles = requiredRolesStr
      ? requiredRolesStr.split(',').map(r => r.trim()).filter(r => r)
      : null;
    const requiredRolesType = interaction.options.getString('roles-type') || 'any';

    // Parse blacklisted roles
    const blacklistedRolesStr = interaction.options.getString('blacklisted-roles');
    const blacklistedRoles = blacklistedRolesStr
      ? blacklistedRolesStr.split(',').map(r => r.trim()).filter(r => r)
      : null;

    // Parse bonus entries
    const bonusEntriesStr = interaction.options.getString('bonus-entries');
    let bonusEntries = null;
    if (bonusEntriesStr) {
      bonusEntries = [];
      const pairs = bonusEntriesStr.split(',');
      for (const pair of pairs) {
        const [roleId, entries] = pair.split(':').map(s => s.trim());
        if (roleId && entries && !isNaN(parseInt(entries))) {
          bonusEntries.push({ roleId, entries: parseInt(entries) });
        }
      }
    }

    // Other options
    const minAccountAge = interaction.options.getInteger('min-account-age');
    const minServerTime = interaction.options.getInteger('min-server-time');
    const minLevel = interaction.options.getInteger('min-level');
    const minMessages = interaction.options.getInteger('min-messages');
    const embedColor = interaction.options.getString('color') || '#9333ea';
    const embedImage = interaction.options.getString('image');
    const embedThumbnail = interaction.options.getString('thumbnail');
    const dmWinners = interaction.options.getBoolean('dm-winners') ?? true;
    const winnerMessage = interaction.options.getString('winner-message');
    const isDropGiveaway = interaction.options.getBoolean('drop') ?? false;

    // Validate color format
    if (embedColor && !/^#[0-9A-Fa-f]{6}$/.test(embedColor)) {
      return interaction.reply({
        content: '❌ Invalid color format! Use hex format: #RRGGBB',
        ephemeral: true
      });
    }

    // Create giveaway data object
    const giveawayData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      prize,
      description,
      winners: winnersCount,
      endsAt,
      createdBy: interaction.user.id,
      participants: [],
      requiredRoles,
      requiredRolesType,
      blacklistedRoles,
      minAccountAge,
      minServerTime,
      minLevel,
      minMessages,
      bonusEntries,
      embedColor,
      embedImage,
      embedThumbnail,
      dmWinners,
      winnerMessage,
      isDropGiveaway,
      status: 'active'
    };

    // Build embed and button
    const embed = buildGiveawayEmbed(giveawayData);
    const row = buildGiveawayButton(false, 0);

    // Send message
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    // Save to database
    giveawayData.messageId = message.id;
    await Giveaway.create(giveawayData);

    await interaction.reply({
      content: `✅ Giveaway created successfully!${isDropGiveaway ? ' (Drop mode - first to click wins!)' : ''}`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Giveaway creation error:', error);
    await interaction.reply({
      content: '❌ Failed to create giveaway. Please try again.',
      ephemeral: true
    });
  }
}

async function handleEnd(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id,
        status: { [Op.in]: ['active', 'paused'] }
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found or already ended.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // End the giveaway using the scheduler logic
    const { endGiveaway } = require('../../utils/giveawayScheduler');
    await endGiveaway(interaction.client, giveaway);

    await interaction.editReply({
      content: `✅ Giveaway #${giveawayId} has been ended!`
    });

  } catch (error) {
    console.error('Giveaway end error:', error);
    if (interaction.deferred) {
      await interaction.editReply({ content: '❌ Failed to end giveaway.' });
    } else {
      await interaction.reply({ content: '❌ Failed to end giveaway.', ephemeral: true });
    }
  }
}

async function handleReroll(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');
    const newWinnersCount = interaction.options.getInteger('winners');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id,
        status: 'ended'
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found or not ended yet.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const { rerollGiveaway } = require('../../utils/giveawayScheduler');
    const winners = await rerollGiveaway(interaction.client, giveaway, newWinnersCount);

    if (winners.length === 0) {
      await interaction.editReply({
        content: '❌ No valid participants to reroll from.'
      });
    } else {
      await interaction.editReply({
        content: `✅ Rerolled! New winner(s): ${winners.map(w => `<@${w.id}>`).join(', ')}`
      });
    }

  } catch (error) {
    console.error('Giveaway reroll error:', error);
    if (interaction.deferred) {
      await interaction.editReply({ content: '❌ Failed to reroll giveaway.' });
    } else {
      await interaction.reply({ content: '❌ Failed to reroll giveaway.', ephemeral: true });
    }
  }
}

async function handlePause(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id,
        status: 'active'
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found or not active.',
        ephemeral: true
      });
    }

    const now = new Date();
    const timeRemaining = new Date(giveaway.endsAt).getTime() - now.getTime();

    await giveaway.update({
      status: 'paused',
      pausedAt: now,
      pausedTimeRemaining: timeRemaining
    });

    // Update message
    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      const embed = buildGiveawayEmbed(giveaway.toJSON());
      embed.setFooter({ text: `${giveaway.winners} winner(s) | PAUSED` });
      embed.setTimestamp(null);

      const row = buildGiveawayButton(true, giveaway.participants?.length || 0);

      await message.edit({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to update giveaway message:', err);
    }

    await interaction.reply({
      content: `✅ Giveaway #${giveawayId} has been paused!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Giveaway pause error:', error);
    await interaction.reply({
      content: '❌ Failed to pause giveaway.',
      ephemeral: true
    });
  }
}

async function handleResume(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id,
        status: 'paused'
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found or not paused.',
        ephemeral: true
      });
    }

    // Calculate new end time
    const newEndsAt = new Date(Date.now() + giveaway.pausedTimeRemaining);

    await giveaway.update({
      status: 'active',
      endsAt: newEndsAt,
      pausedAt: null,
      pausedTimeRemaining: null
    });

    // Update message
    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      const updatedGiveaway = giveaway.toJSON();
      updatedGiveaway.endsAt = newEndsAt;
      updatedGiveaway.status = 'active';

      const embed = buildGiveawayEmbed(updatedGiveaway);
      const row = buildGiveawayButton(false, giveaway.participants?.length || 0);

      await message.edit({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to update giveaway message:', err);
    }

    await interaction.reply({
      content: `✅ Giveaway #${giveawayId} has been resumed! Ends <t:${Math.floor(newEndsAt.getTime() / 1000)}:R>`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Giveaway resume error:', error);
    await interaction.reply({
      content: '❌ Failed to resume giveaway.',
      ephemeral: true
    });
  }
}

async function handleList(interaction) {
  try {
    const statusFilter = interaction.options.getString('status') || 'active';

    const where = { guildId: interaction.guild.id };
    if (statusFilter !== 'all') {
      where.status = statusFilter;
    }

    const giveaways = await Giveaway.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (giveaways.length === 0) {
      return interaction.reply({
        content: `📋 No ${statusFilter === 'all' ? '' : statusFilter + ' '}giveaways found.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Giveaways (${statusFilter})`)
      .setColor('#9333ea')
      .setDescription(giveaways.map(g => {
        const statusIcon = g.status === 'active' ? '🟢' : g.status === 'paused' ? '⏸️' : g.status === 'ended' ? '🔴' : '⚫';
        const timeInfo = g.status === 'active'
          ? `Ends <t:${Math.floor(new Date(g.endsAt).getTime() / 1000)}:R>`
          : g.status === 'paused'
          ? 'Paused'
          : `Ended <t:${Math.floor(new Date(g.endsAt).getTime() / 1000)}:R>`;
        return `${statusIcon} **#${g.id}** - ${g.prize}\n└ ${timeInfo} | ${g.participants?.length || 0} entries`;
      }).join('\n\n'))
      .setFooter({ text: `Showing ${giveaways.length} giveaway(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Giveaway list error:', error);
    await interaction.reply({
      content: '❌ Failed to list giveaways.',
      ephemeral: true
    });
  }
}

async function handleInfo(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found.',
        ephemeral: true
      });
    }

    const statusIcon = giveaway.status === 'active' ? '🟢' : giveaway.status === 'paused' ? '⏸️' : giveaway.status === 'ended' ? '🔴' : '⚫';

    const embed = new EmbedBuilder()
      .setTitle(`${statusIcon} Giveaway #${giveaway.id}`)
      .setColor(giveaway.embedColor || '#9333ea')
      .addFields(
        { name: 'Prize', value: giveaway.prize, inline: true },
        { name: 'Status', value: giveaway.status.toUpperCase(), inline: true },
        { name: 'Winners', value: `${giveaway.winners}`, inline: true },
        { name: 'Participants', value: `${giveaway.participants?.length || 0}`, inline: true },
        { name: 'Created By', value: `<@${giveaway.createdBy}>`, inline: true },
        { name: 'Channel', value: `<#${giveaway.channelId}>`, inline: true }
      );

    if (giveaway.status === 'active') {
      embed.addFields({ name: 'Ends At', value: `<t:${Math.floor(new Date(giveaway.endsAt).getTime() / 1000)}:F>`, inline: false });
    } else if (giveaway.status === 'paused') {
      const mins = Math.floor(giveaway.pausedTimeRemaining / 60000);
      embed.addFields({ name: 'Time Remaining', value: `${mins} minutes`, inline: false });
    }

    if (giveaway.winnersList?.length > 0) {
      embed.addFields({ name: 'Winners', value: giveaway.winnersList.join(', '), inline: false });
    }

    // Requirements
    const requirements = [];
    if (giveaway.requiredRoles?.length > 0) {
      requirements.push(`Required Roles (${giveaway.requiredRolesType}): ${giveaway.requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (giveaway.blacklistedRoles?.length > 0) {
      requirements.push(`Blacklisted: ${giveaway.blacklistedRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (giveaway.minAccountAge) requirements.push(`Min Account Age: ${giveaway.minAccountAge} days`);
    if (giveaway.minServerTime) requirements.push(`Min Server Time: ${giveaway.minServerTime} days`);
    if (giveaway.minLevel) requirements.push(`Min Level: ${giveaway.minLevel}`);
    if (giveaway.minMessages) requirements.push(`Min Messages: ${giveaway.minMessages}`);

    if (requirements.length > 0) {
      embed.addFields({ name: 'Requirements', value: requirements.join('\n'), inline: false });
    }

    if (giveaway.bonusEntries?.length > 0) {
      const bonusText = giveaway.bonusEntries.map(b => `<@&${b.roleId}>: +${b.entries}`).join(', ');
      embed.addFields({ name: 'Bonus Entries', value: bonusText, inline: false });
    }

    embed.addFields(
      { name: 'DM Winners', value: giveaway.dmWinners ? 'Yes' : 'No', inline: true },
      { name: 'Drop Mode', value: giveaway.isDropGiveaway ? 'Yes' : 'No', inline: true }
    );

    embed.setTimestamp(new Date(giveaway.createdAt));

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Giveaway info error:', error);
    await interaction.reply({
      content: '❌ Failed to get giveaway info.',
      ephemeral: true
    });
  }
}

async function handleCancel(interaction) {
  try {
    const giveawayId = interaction.options.getInteger('id');

    const giveaway = await Giveaway.findOne({
      where: {
        id: giveawayId,
        guildId: interaction.guild.id,
        status: { [Op.in]: ['active', 'paused'] }
      }
    });

    if (!giveaway) {
      return interaction.reply({
        content: '❌ Giveaway not found or already ended/cancelled.',
        ephemeral: true
      });
    }

    await giveaway.update({ status: 'cancelled' });

    // Update message
    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Cancelled 🎉')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ This giveaway has been cancelled.`)
        .setColor('#ED4245')
        .setFooter({ text: 'Cancelled' })
        .setTimestamp();

      await message.edit({ embeds: [embed], components: [] });
    } catch (err) {
      console.error('Failed to update giveaway message:', err);
    }

    await interaction.reply({
      content: `✅ Giveaway #${giveawayId} has been cancelled!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Giveaway cancel error:', error);
    await interaction.reply({
      content: '❌ Failed to cancel giveaway.',
      ephemeral: true
    });
  }
}
