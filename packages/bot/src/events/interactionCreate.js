const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../utils/logger');
const { createErrorEmbed } = require('../utils/embedBuilder');
const { TicketConfig, Giveaway, UserLevel } = require('@kira/shared/src/database/models');
const { checkLicense } = require('../middleware/licenseCheck');
const { handleDropGiveawayWin } = require('../utils/giveawayScheduler');

async function createTicketChannel(interaction, client, config, category = null, formData = null) {
  const newCounter = config.ticketCounter + 1;
  await config.update({ ticketCounter: newCounter });

  let categoryId = category?.categoryId || config.ticketCategoryId || null;
  
  if (categoryId && !interaction.guild.channels.cache.has(categoryId)) {
    categoryId = null;
  }

  const supportRoleIds = category?.supportRoleIds?.length > 0
    ? category.supportRoleIds
    : (config.supportRoleIds || (config.supportRoleId ? [config.supportRoleId] : []));

  const pattern = category?.channelNamePattern || config.channelNamePattern || 'ticket-{number}';
  const channelName = pattern
    .replace('{number}', newCounter.toString().padStart(4, '0'))
    .replace('{username}', interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    .replace('{category}', category?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'ticket');

  const permissionOverwrites = [
    {
      id: interaction.guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    }
  ];

  if (supportRoleIds.length > 0) {
    for (const roleId of supportRoleIds) {
      if (roleId && interaction.guild.roles.cache.has(roleId)) {
        permissionOverwrites.push({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
        });
      }
    }
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    topic: `Zgłoszenie od: ${interaction.user.tag} | ID: ${interaction.user.id}${category ? ` | Kategoria: ${category.name}` : ''}`,
    permissionOverwrites: permissionOverwrites,
  });

  const validSupportRoles = supportRoleIds.filter(id => interaction.guild.roles.cache.has(id));
  const supportMentions = validSupportRoles.map(id => `<@&${id}>`).join(' ');

  let description = `Witaj ${interaction.user}!\n\nDziękujemy za kontakt. `;

  if (category) {
    description += `\n**Kategoria:** ${category.emoji || '📨'} ${category.name}`;
    if (category.description) {
      description += `\n*${category.description}*`;
    }
    description += '\n';
  }

  if (formData && Object.keys(formData).length > 0) {
    description += '\n**Informacje z formularza:**\n';
    for (const [fieldId, value] of Object.entries(formData)) {
      const fieldLabel = category?.form?.fields?.find(f => f.id === fieldId)?.label || fieldId;
      description += `**${fieldLabel}:** ${value}\n`;
    }
  } else {
    description += 'Opisz dokładnie swój problem, a nasz zespół wsparcia odpowie najszybciej jak to możliwe.';
  }

  description += `\n\n**Oczekiwanie na Support:** ${supportMentions || 'Administrator'}`;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${category?.emoji || '📨'} Zgłoszenie #${newCounter}${category ? ` - ${category.name}` : ''}`)
    .setDescription(description)
    .setColor(category?.color || '#2b2d31')
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'KiraEvo Ticket System', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket_confirm')
    .setLabel('Zamknij')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const claimButton = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel('Przejmij')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🙋‍♂️');

  const transcriptButton = new ButtonBuilder()
    .setCustomId('transcript_ticket')
    .setLabel('Zapisz')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('💾');

  const row = new ActionRowBuilder().addComponents(closeButton, claimButton, transcriptButton);

  await ticketChannel.send({
    content: `${interaction.user} ${supportMentions}`,
    embeds: [welcomeEmbed],
    components: [row]
  });

  if (config.logChannelId) {
    try {
      const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 New Ticket Created')
          .setColor('#57F287')
          .addFields(
            { name: 'Ticket', value: `${ticketChannel}`, inline: true },
            { name: 'User', value: `${interaction.user.tag}`, inline: true },
            { name: 'Ticket #', value: `${newCounter}`, inline: true }
          );

        if (category) {
          logEmbed.addFields({ name: 'Category', value: `${category.emoji || '📨'} ${category.name}`, inline: true });
        }

        logEmbed.setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      logger.error('Failed to send ticket log:', err);
    }
  }

  return ticketChannel;
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Defer natychmiast zeby nie przekroczyc 3s limitu Discord
      const deferFirst = ['play'];
      if (deferFirst.includes(interaction.commandName)) {
        await interaction.deferReply();
      }

      // Sprawdź licencję przed wykonaniem komendy
      const hasValidLicense = await checkLicense(interaction);
      if (!hasValidLicense) {
        return; // checkLicense już wysłało odpowiedź do użytkownika
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Error executing ${interaction.commandName}:`, error);
        const errorEmbed = createErrorEmbed('Command Error', 'There was an error while executing this command!');

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          logger.error(`Failed to send error response for ${interaction.commandName}:`, replyError.message);
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_form_')) {
        try {
          await interaction.deferReply({ ephemeral: true });

          const categoryId = interaction.customId.replace('ticket_form_', '');

          const config = await TicketConfig.findOne({
            where: { guildId: interaction.guild.id }
          });

          if (!config || !config.enabled) {
            return interaction.editReply({ content: '❌ System ticketów jest obecnie wyłączony.' });
          }

          const category = config.categories?.find(c => c.id === categoryId);

          const formData = {};
          if (category?.form?.fields) {
            for (const field of category.form.fields) {
              try {
                const value = interaction.fields.getTextInputValue(field.id);
                if (value) {
                  formData[field.id] = value;
                }
              } catch (e) {
              }
            }
          }

          const ticketChannel = await createTicketChannel(interaction, client, config, category, formData);

          await interaction.editReply({
            embeds: [new EmbedBuilder().setColor('#57F287').setDescription(`✅ Utworzono zgłoszenie: ${ticketChannel}`)]
          });

        } catch (error) {
          logger.error('Error creating ticket from form:', error);
          await interaction.editReply({ content: '❌ Wystąpił błąd podczas tworzenia ticketa. Sprawdź logi bota lub skontaktuj się z administratorem.' });
        }
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category_select') {
        try {
          const categoryId = interaction.values[0];

          const config = await TicketConfig.findOne({
            where: { guildId: interaction.guild.id }
          });

          if (!config || !config.enabled) {
            return interaction.reply({ content: '❌ System ticketów jest obecnie wyłączony.', ephemeral: true });
          }

          const category = config.categories?.find(c => c.id === categoryId);

          if (!category) {
            return interaction.reply({ content: '❌ Nie znaleziono wybranej kategorii.', ephemeral: true });
          }

          if (category.form?.enabled && category.form?.fields?.length > 0) {
            const modal = new ModalBuilder()
              .setCustomId(`ticket_form_${category.id}`)
              .setTitle(category.form.title || `${category.name} - Formularz`);

            const fields = category.form.fields.slice(0, 5);
            for (const field of fields) {
              const textInput = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required !== false);

              if (field.placeholder) textInput.setPlaceholder(field.placeholder);
              if (field.minLength) textInput.setMinLength(field.minLength);
              if (field.maxLength) textInput.setMaxLength(field.maxLength);
              if (field.value) textInput.setValue(field.value);

              modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            }

            await interaction.showModal(modal);
          } else {
            await interaction.deferReply({ ephemeral: true });
            const ticketChannel = await createTicketChannel(interaction, client, config, category);
            await interaction.editReply({
              embeds: [new EmbedBuilder().setColor('#57F287').setDescription(`✅ Utworzono zgłoszenie: ${ticketChannel}`)]
            });
          }

        } catch (error) {
          logger.error('Error handling category selection:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Wystąpił błąd. Spróbuj ponownie.', ephemeral: true });
          } else {
            await interaction.editReply({ content: '❌ Wystąpił błąd. Spróbuj ponownie.' });
          }
        }
      }
      return;
    }

    if (interaction.isButton()) {

      if (interaction.customId === 'create_ticket') {
        try {
          const config = await TicketConfig.findOne({
            where: { guildId: interaction.guild.id }
          });

          if (!config || !config.enabled) {
            return interaction.reply({ content: '❌ System ticketów jest obecnie wyłączony.', ephemeral: true });
          }

          if (config.useCategorySelect && config.categories?.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('ticket_category_select')
              .setPlaceholder('Wybierz kategorię zgłoszenia...')
              .addOptions(
                config.categories.map(cat => ({
                  label: cat.name,
                  description: cat.description?.substring(0, 100) || `Otwórz zgłoszenie: ${cat.name}`,
                  value: cat.id,
                  emoji: cat.emoji || undefined
                }))
              );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.reply({
              content: '📋 Wybierz kategorię zgłoszenia:',
              components: [row],
              ephemeral: true
            });
          }

          await interaction.deferReply({ ephemeral: true });
          const ticketChannel = await createTicketChannel(interaction, client, config);

          await interaction.editReply({
             embeds: [new EmbedBuilder().setColor('#57F287').setDescription(`✅ Utworzono zgłoszenie: ${ticketChannel}`)]
          });

        } catch (error) {
          logger.error('Error creating ticket:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Wystąpił błąd podczas tworzenia ticketa.', ephemeral: true });
          } else {
            await interaction.editReply({ content: '❌ Wystąpił błąd podczas tworzenia ticketa. Skontaktuj się z administratorem.' });
          }
        }
      }

      if (interaction.customId.startsWith('ticket_cat_')) {
        try {
          const categoryId = interaction.customId.replace('ticket_cat_', '');

          const config = await TicketConfig.findOne({
            where: { guildId: interaction.guild.id }
          });

          if (!config || !config.enabled) {
            return interaction.reply({ content: '❌ System ticketów jest obecnie wyłączony.', ephemeral: true });
          }

          const category = config.categories?.find(c => c.id === categoryId);

          if (!category) {
            return interaction.reply({ content: '❌ Nie znaleziono wybranej kategorii.', ephemeral: true });
          }

          if (category.form?.enabled && category.form?.fields?.length > 0) {
            const modal = new ModalBuilder()
              .setCustomId(`ticket_form_${category.id}`)
              .setTitle(category.form.title || `${category.name} - Formularz`);

            const fields = category.form.fields.slice(0, 5);
            for (const field of fields) {
              const textInput = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required !== false);

              if (field.placeholder) textInput.setPlaceholder(field.placeholder);
              if (field.minLength) textInput.setMinLength(field.minLength);
              if (field.maxLength) textInput.setMaxLength(field.maxLength);
              if (field.value) textInput.setValue(field.value);

              modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            }

            await interaction.showModal(modal);
          } else {
            await interaction.deferReply({ ephemeral: true });
            const ticketChannel = await createTicketChannel(interaction, client, config, category);
            await interaction.editReply({
              embeds: [new EmbedBuilder().setColor('#57F287').setDescription(`✅ Utworzono zgłoszenie: ${ticketChannel}`)]
            });
          }

        } catch (error) {
          logger.error('Error creating category ticket:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Wystąpił błąd. Spróbuj ponownie.', ephemeral: true });
          } else {
            await interaction.editReply({ content: '❌ Wystąpił błąd. Spróbuj ponownie.' });
          }
        }
      }

      if (interaction.customId === 'close_ticket_confirm') {
          const confirmEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription('Czy na pewno chcesz zamknąć to zgłoszenie? Ta operacja jest nieodwracalna.');
            
          const yesBtn = new ButtonBuilder()
            .setCustomId('close_ticket_action')
            .setLabel('Tak, zamknij')
            .setStyle(ButtonStyle.Danger);
            
          const noBtn = new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('Anuluj')
            .setStyle(ButtonStyle.Secondary);
            
          const row = new ActionRowBuilder().addComponents(yesBtn, noBtn);
          
          await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: false });
      }
      
      if (interaction.customId === 'cancel_close') {
          await interaction.message.delete();
      }

      if (interaction.customId === 'close_ticket_action') {
        if (!interaction.channel.name.startsWith('ticket-')) return;

        const config = await TicketConfig.findOne({ where: { guildId: interaction.guild.id } });
        const channelName = interaction.channel.name;
        const closedBy = interaction.user.tag;

        await interaction.update({ components: [] });
        await interaction.channel.send({
            embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('🔒 Zgłoszenie zostanie usunięte za 5 sekund...')]
        });

        if (config && config.logChannelId) {
          try {
            const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('🔒 Ticket Closed')
                .setColor('#ED4245')
                .addFields(
                  { name: 'Channel', value: `#${channelName}`, inline: true },
                  { name: 'Closed By', value: closedBy, inline: true }
                )
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] });
            }
          } catch (err) {
            logger.error('Failed to send ticket close log:', err);
          }
        }

        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                logger.error('Error deleting ticket channel:', err);
            }
        }, 5000);
      }

      if (interaction.customId === 'claim_ticket') {
          await interaction.deferUpdate();

          const config = await TicketConfig.findOne({ where: { guildId: interaction.guild.id } });

          await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
              SendMessages: true,
              ViewChannel: true,
              AttachFiles: true
          });

          const supportRoleIds = config?.supportRoleIds || (config?.supportRoleId ? [config.supportRoleId] : []);
          if (supportRoleIds.length > 0) {
            for (const roleId of supportRoleIds) {
                if (interaction.guild.roles.cache.has(roleId)) {
                    await interaction.channel.permissionOverwrites.edit(roleId, {
                        SendMessages: false
                    });
                }
            }
          }

          const claimEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setDescription(`🙋‍♂️ Zgłoszenie zostało przejęte przez: **${interaction.user.tag}**`);

          await interaction.channel.send({ embeds: [claimEmbed] });

          const oldComponents = interaction.message.components[0].components;
          const newRow = new ActionRowBuilder();

          oldComponents.forEach(comp => {
              if (comp.customId === 'claim_ticket') {
                  const btn = ButtonBuilder.from(comp).setDisabled(true).setLabel(`Przejęte: ${interaction.user.username}`);
                  newRow.addComponents(btn);
              } else {
                  newRow.addComponents(comp);
              }
          });

          await interaction.message.edit({ components: [newRow] });
      }

      if (interaction.customId === 'transcript_ticket') {
          await interaction.reply({ content: 'Generowanie zapisu...', ephemeral: true });

          const config = await TicketConfig.findOne({ where: { guildId: interaction.guild.id } });

          const messages = await interaction.channel.messages.fetch({ limit: 100 });
          const transcript = messages.reverse().map(m =>
              `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content} ${m.attachments.size > 0 ? '(Załącznik)' : ''}`
          ).join('\n');

          const buffer = Buffer.from(transcript, 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

          if (config && config.logChannelId) {
            try {
              const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
              if (logChannel) {
                await logChannel.send({
                  content: `📝 Transcript from **#${interaction.channel.name}** - Generated by ${interaction.user.tag}`,
                  files: [attachment]
                });
                await interaction.editReply({ content: '✅ Transcript saved to log channel!' });
                return;
              }
            } catch (err) {
              logger.error('Failed to send transcript to log channel:', err);
            }
          }

          await interaction.channel.send({
              content: `📝 Zapis rozmowy wygenerowany przez ${interaction.user}`,
              files: [attachment]
          });

          await interaction.deleteReply();
      }

      if (interaction.customId.startsWith('role_')) {
        const { models } = require('@kira/shared');
        const { validatePanelRequirements, checkPanelMode, sendDMNotification, logRoleChange } = require('../utils/reactionRoleHelpers');
        const { scheduleTempRoleRemoval, cancelTempRoleRemoval } = require('../utils/tempRoleScheduler');

        try {
          const parts = interaction.customId.split('_');
          if (parts.length !== 3) {
            return interaction.reply({
              content: '❌ Nieprawidłowy przycisk roli.',
              ephemeral: true
            });
          }

          const [, , roleId] = parts;
          const member = interaction.member;
          const guildId = interaction.guild.id;
          const role = interaction.guild.roles.cache.get(roleId);

          if (!role) {
            return interaction.reply({
              content: '❌ Rola nie została znaleziona. Może została usunięta.',
              ephemeral: true
            });
          }

          // Find the panel this button belongs to
          const guildData = await models.Guild.findOne({
            where: { guildId, isActive: true },
            include: [{ model: models.License, as: 'license' }]
          });

          if (!guildData) {
            return interaction.reply({
              content: '❌ Guild not found in database.',
              ephemeral: true
            });
          }

          // Check license
          if (!guildData.license || !guildData.license.isValid()) {
            return interaction.reply({
              content: '❌ This server does not have a valid license.',
              ephemeral: true
            });
          }

          const reactionRoles = guildData.settings?.reactionRoles || [];
          const panel = reactionRoles.find(p =>
            p.messageId === interaction.message.id &&
            p.interactionType === 'button' &&
            p.roles.some(r => r.roleId === roleId)
          );

          if (!panel) {
            return interaction.reply({
              content: '❌ Panel configuration not found.',
              ephemeral: true
            });
          }

          // Check if panel is enabled
          if (panel.enabled === false) {
            return interaction.reply({
              content: '❌ This panel is currently disabled.',
              ephemeral: true
            });
          }

          const roleConfig = panel.roles.find(r => r.roleId === roleId);
          const isAdding = !member.roles.cache.has(roleId);

          // Check panel requirements (only when adding)
          if (isAdding) {
            const validation = await validatePanelRequirements(member, panel);
            if (!validation.valid) {
              return interaction.reply({
                content: `❌ ${validation.reason}`,
                ephemeral: true
              });
            }
          }

          // Check panel mode restrictions
          const modeCheck = checkPanelMode(member, panel, roleId, isAdding);
          if (!modeCheck.allowed) {
            // Single mode: auto-remove other roles
            if (modeCheck.shouldRemoveOthers && panel.panelMode === 'single') {
              try {
                for (const oldRoleId of modeCheck.rolesToRemove) {
                  await member.roles.remove(oldRoleId);
                  cancelTempRoleRemoval(guildId, member.id, oldRoleId);
                }
              } catch (err) {
                logger.error('Failed to remove old roles in single mode:', err);
              }
            } else {
              return interaction.reply({
                content: `❌ ${modeCheck.reason}`,
                ephemeral: true
              });
            }
          }

          // Check bot permissions
          const botMember = interaction.guild.members.me;
          if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
              content: '❌ Nie mam uprawnień do zarządzania tą rolą.',
              ephemeral: true
            });
          }

          // Add or remove role
          if (isAdding) {
            await member.roles.add(roleId);
            logger.info(`[ReactionRole Button] Added role ${role.name} to user ${member.user.tag}`);

            // Schedule temporary role removal
            if (roleConfig?.tempDurationSeconds && roleConfig.tempDurationSeconds > 0) {
              scheduleTempRoleRemoval(client, guildId, member.id, roleId, roleConfig.tempDurationSeconds);
            }

            // Send DM notification
            if (panel.dmNotification && panel.dmMessage) {
              await sendDMNotification(member.user, panel.dmMessage, role, interaction.guild, true);
            }

            // Log to channel
            if (panel.logChannel) {
              await logRoleChange(interaction.guild, panel.logChannel, member.user, role, true, 'button');
            }

            let responseMessage = `✅ Dodano rolę **${role.name}**`;
            if (roleConfig?.tempDurationSeconds && roleConfig.tempDurationSeconds > 0) {
              const hours = Math.floor(roleConfig.tempDurationSeconds / 3600);
              const minutes = Math.floor((roleConfig.tempDurationSeconds % 3600) / 60);
              if (hours > 0) {
                responseMessage += `\n⏰ Temporary role expires in ${hours}h ${minutes}m`;
              } else {
                responseMessage += `\n⏰ Temporary role expires in ${minutes}m`;
              }
            }

            return interaction.reply({
              content: responseMessage,
              ephemeral: true
            });
          } else {
            await member.roles.remove(roleId);
            logger.info(`[ReactionRole Button] Removed role ${role.name} from user ${member.user.tag}`);

            // Cancel scheduled removal
            cancelTempRoleRemoval(guildId, member.id, roleId);

            // Send DM notification
            if (panel.dmNotification && panel.dmMessage) {
              await sendDMNotification(member.user, panel.dmMessage, role, interaction.guild, false);
            }

            // Log to channel
            if (panel.logChannel) {
              await logRoleChange(interaction.guild, panel.logChannel, member.user, role, false, 'button');
            }

            return interaction.reply({
              content: `✅ Usunięto rolę **${role.name}**`,
              ephemeral: true
            });
          }

        } catch (error) {
          logger.error('Reaction role button error:', error);
          return interaction.reply({
            content: '❌ Wystąpił błąd. Spróbuj ponownie.',
            ephemeral: true
          });
        }
      }

      if (interaction.customId === 'giveaway_enter') {
        try {
          const giveaway = await Giveaway.findOne({
            where: {
              messageId: interaction.message.id,
              status: 'active'
            }
          });

          if (!giveaway) {
            return interaction.reply({
              content: '❌ This giveaway has ended or no longer exists.',
              ephemeral: true
            });
          }

          if (new Date() > new Date(giveaway.endsAt)) {
            return interaction.reply({
              content: '❌ This giveaway has already ended!',
              ephemeral: true
            });
          }

          const member = interaction.member;
          const userId = interaction.user.id;
          const participants = giveaway.participants || [];

          // Check if user is leaving (toggle off)
          if (participants.includes(userId)) {
            const newParticipants = participants.filter(id => id !== userId);
            await giveaway.update({ participants: newParticipants });

            // Update button count
            try {
              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('giveaway_enter')
                  .setLabel(`Enter Giveaway${newParticipants.length > 0 ? ` (${newParticipants.length})` : ''}`)
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🎉')
              );
              await interaction.message.edit({ components: [row] });
            } catch (err) {
              // Ignore edit errors
            }

            return interaction.reply({
              content: '✅ You have left the giveaway!',
              ephemeral: true
            });
          }

          // === VALIDATION FOR NEW ENTRIES ===

          // Check single required role (legacy)
          if (giveaway.requiredRole) {
            if (!member.roles.cache.has(giveaway.requiredRole)) {
              return interaction.reply({
                content: `❌ You need the <@&${giveaway.requiredRole}> role to enter this giveaway!`,
                ephemeral: true
              });
            }
          }

          // Check multiple required roles
          if (giveaway.requiredRoles && giveaway.requiredRoles.length > 0) {
            const userRoleIds = Array.from(member.roles.cache.keys());

            if (giveaway.requiredRolesType === 'all') {
              // User must have ALL required roles
              const hasAll = giveaway.requiredRoles.every(roleId => userRoleIds.includes(roleId));
              if (!hasAll) {
                const missingRoles = giveaway.requiredRoles
                  .filter(roleId => !userRoleIds.includes(roleId))
                  .map(roleId => `<@&${roleId}>`)
                  .join(', ');
                return interaction.reply({
                  content: `❌ You need ALL of these roles to enter: ${missingRoles}`,
                  ephemeral: true
                });
              }
            } else {
              // User must have ANY of the required roles
              const hasAny = giveaway.requiredRoles.some(roleId => userRoleIds.includes(roleId));
              if (!hasAny) {
                const requiredRoles = giveaway.requiredRoles.map(roleId => `<@&${roleId}>`).join(', ');
                return interaction.reply({
                  content: `❌ You need at least one of these roles to enter: ${requiredRoles}`,
                  ephemeral: true
                });
              }
            }
          }

          // Check blacklisted roles
          if (giveaway.blacklistedRoles && giveaway.blacklistedRoles.length > 0) {
            const userRoleIds = Array.from(member.roles.cache.keys());
            const hasBlacklisted = giveaway.blacklistedRoles.some(roleId => userRoleIds.includes(roleId));
            if (hasBlacklisted) {
              return interaction.reply({
                content: '❌ You have a role that is not allowed to enter this giveaway!',
                ephemeral: true
              });
            }
          }

          // Check minimum account age
          if (giveaway.minAccountAge) {
            const accountAge = Math.floor((Date.now() - interaction.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (accountAge < giveaway.minAccountAge) {
              return interaction.reply({
                content: `❌ Your Discord account must be at least ${giveaway.minAccountAge} days old to enter! (Your account is ${accountAge} days old)`,
                ephemeral: true
              });
            }
          }

          // Check minimum server time
          if (giveaway.minServerTime) {
            const serverTime = Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24));
            if (serverTime < giveaway.minServerTime) {
              return interaction.reply({
                content: `❌ You must be a member of this server for at least ${giveaway.minServerTime} days to enter! (You've been here ${serverTime} days)`,
                ephemeral: true
              });
            }
          }

          // Check minimum level
          if (giveaway.minLevel) {
            const userLevel = await UserLevel.findOne({
              where: {
                discordId: userId,
                guildId: interaction.guild.id
              }
            });
            const currentLevel = userLevel?.level || 0;
            if (currentLevel < giveaway.minLevel) {
              return interaction.reply({
                content: `❌ You need to be at least level ${giveaway.minLevel} to enter! (Your level: ${currentLevel})`,
                ephemeral: true
              });
            }
          }

          // Check minimum messages
          if (giveaway.minMessages) {
            const userLevel = await UserLevel.findOne({
              where: {
                discordId: userId,
                guildId: interaction.guild.id
              }
            });
            const messageCount = userLevel?.totalMessages || 0;
            if (messageCount < giveaway.minMessages) {
              return interaction.reply({
                content: `❌ You need at least ${giveaway.minMessages} messages in this server to enter! (Your messages: ${messageCount})`,
                ephemeral: true
              });
            }
          }

          // All validations passed - add user to participants
          const newParticipants = [...participants, userId];
          await giveaway.update({ participants: newParticipants });

          // Handle drop giveaway - instant win if we reached winner count
          if (giveaway.isDropGiveaway && newParticipants.length >= giveaway.winners) {
            const guild = interaction.guild;
            const channel = interaction.channel;
            const message = interaction.message;

            await interaction.reply({
              content: '🎁 You claimed the prize! Congratulations!',
              ephemeral: true
            });

            await handleDropGiveawayWin(interaction.client, giveaway, guild, channel, message);
            return;
          }

          // Update button count
          try {
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel(`Enter Giveaway (${newParticipants.length})`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉')
            );
            await interaction.message.edit({ components: [row] });
          } catch (err) {
            // Ignore edit errors
          }

          // Calculate bonus entries for this user
          let bonusInfo = '';
          if (giveaway.bonusEntries && giveaway.bonusEntries.length > 0) {
            const userRoleIds = Array.from(member.roles.cache.keys());
            let totalBonus = 0;
            for (const bonus of giveaway.bonusEntries) {
              if (userRoleIds.includes(bonus.roleId)) {
                totalBonus += bonus.entries;
              }
            }
            if (totalBonus > 0) {
              bonusInfo = `\n⭐ You have **+${totalBonus}** bonus entries!`;
            }
          }

          return interaction.reply({
            content: `✅ You have entered the giveaway! Good luck! 🎉${bonusInfo}`,
            ephemeral: true
          });

        } catch (error) {
          logger.error('Giveaway enter error:', error);
          return interaction.reply({
            content: '❌ An error occurred. Please try again.',
            ephemeral: true
          });
        }
      }
    }
  }
};
