const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const { TicketConfig } = require('@kira/shared/src/database/models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Wysyła interaktywny panel ticketów na ten kanał')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Tryb wyświetlania panelu')
        .setRequired(false)
        .addChoices(
          { name: 'Jeden przycisk (domyślny)', value: 'single' },
          { name: 'Przyciski dla każdej kategorii', value: 'buttons' },
          { name: 'Lista rozwijana (select menu)', value: 'select' }
        ))
    .addStringOption(option =>
      option.setName('category')
        .setDescription('ID kategorii (tylko dla trybu single z konkretną kategorią)')
        .setRequired(false)),

  async execute(interaction) {
    const config = await TicketConfig.findOne({ where: { guildId: interaction.guild.id } });

    if (!config || !config.enabled) {
      return interaction.reply({ content: '⚠️ System ticketów nie jest skonfigurowany lub jest wyłączony w panelu Dashboard. Skonfiguruj go w panelu.', ephemeral: true });
    }

    const mode = interaction.options.getString('mode') || 'single';
    const specificCategoryId = interaction.options.getString('category');

    const embed = new EmbedBuilder()
      .setTitle(config.panelTitle || 'Centrum Pomocy')
      .setColor('#5865F2')
      .setFooter({ text: 'KiraEvo Ticket System', iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    const categories = config.categories || [];
    let components = [];

    if (mode === 'buttons' && categories.length > 0) {
      // Mode: Multiple buttons for each category
      let description = config.panelDescription || 'Wybierz kategorię zgłoszenia klikając odpowiedni przycisk.';
      description += '\n\n**Dostępne kategorie:**';

      for (const cat of categories) {
        description += `\n${cat.emoji || '📨'} **${cat.name}**`;
        if (cat.description) {
          description += ` - ${cat.description}`;
        }
      }

      embed.setDescription(description);

      // Create buttons for categories (max 5 per row, max 5 rows = 25 buttons)
      const rows = [];
      let currentRow = new ActionRowBuilder();

      for (let i = 0; i < Math.min(categories.length, 25); i++) {
        const cat = categories[i];

        const button = new ButtonBuilder()
          .setCustomId(`ticket_cat_${cat.id}`)
          .setLabel(cat.name)
          .setStyle(ButtonStyle.Primary);

        if (cat.emoji) {
          button.setEmoji(cat.emoji);
        }

        currentRow.addComponents(button);

        // Max 5 buttons per row
        if ((i + 1) % 5 === 0 || i === categories.length - 1) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
      }

      components = rows;

    } else if (mode === 'select' && categories.length > 0) {
      // Mode: Select menu
      let description = config.panelDescription || 'Wybierz kategorię zgłoszenia z listy poniżej.';
      description += '\n\n**Dostępne kategorie:**';

      for (const cat of categories) {
        description += `\n${cat.emoji || '📨'} **${cat.name}**`;
        if (cat.description) {
          description += ` - ${cat.description}`;
        }
      }

      embed.setDescription(description);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Wybierz kategorię...')
        .addOptions(
          categories.slice(0, 25).map(cat => ({
            label: cat.name,
            description: cat.description?.substring(0, 100) || `Otwórz zgłoszenie: ${cat.name}`,
            value: cat.id,
            emoji: cat.emoji || undefined
          }))
        );

      components = [new ActionRowBuilder().addComponents(selectMenu)];

      // Update config to use category select
      await config.update({ useCategorySelect: true });

    } else if (specificCategoryId && categories.length > 0) {
      // Mode: Single button for specific category
      const category = categories.find(c => c.id === specificCategoryId);

      if (!category) {
        return interaction.reply({
          content: `❌ Nie znaleziono kategorii o ID: ${specificCategoryId}\n\nDostępne kategorie:\n${categories.map(c => `- \`${c.id}\`: ${c.name}`).join('\n')}`,
          ephemeral: true
        });
      }

      embed.setDescription(config.panelDescription || category.description || 'Kliknij przycisk poniżej, aby otworzyć zgłoszenie.');
      embed.setTitle(`${category.emoji || '📨'} ${config.panelTitle || category.name}`);

      if (category.color) {
        embed.setColor(category.color);
      }

      const button = new ButtonBuilder()
        .setCustomId(`ticket_cat_${category.id}`)
        .setLabel(category.name)
        .setStyle(ButtonStyle.Primary);

      if (category.emoji) {
        button.setEmoji(category.emoji);
      }

      components = [new ActionRowBuilder().addComponents(button)];

    } else {
      // Mode: Single default button (original behavior)
      embed.setDescription(config.panelDescription || 'Kliknij przycisk poniżej, aby otworzyć zgłoszenie.');

      const button = new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('Otwórz Zgłoszenie')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');

      components = [new ActionRowBuilder().addComponents(button)];

      // If categories exist, enable select mode for this button
      if (categories.length > 0) {
        await config.update({ useCategorySelect: true });
      }
    }

    const message = await interaction.channel.send({ embeds: [embed], components: components });

    await config.update({
      panelChannelId: interaction.channel.id,
      panelMessageId: message.id
    });

    let replyMsg = '✅ Panel ticketów został wysłany pomyślnie!';

    if (categories.length === 0 && (mode === 'buttons' || mode === 'select')) {
      replyMsg += '\n\n⚠️ Brak skonfigurowanych kategorii. Dodaj kategorie w panelu Dashboard lub użyj komendy `/ticket-category add`.';
    }

    await interaction.reply({ content: replyMsg, ephemeral: true });
  }
};