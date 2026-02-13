const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { TicketConfig } = require('@kira/shared/src/database/models');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-category')
    .setDescription('Zarządzaj kategoriami ticketów')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Dodaj nową kategorię ticketów')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Nazwa kategorii')
            .setRequired(true)
            .setMaxLength(50))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Opis kategorii')
            .setRequired(false)
            .setMaxLength(100))
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Emoji dla kategorii')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Kolor HEX (np. #5865F2)')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('discord_category')
            .setDescription('Kategoria Discord dla ticketów tej kategorii')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('support_role')
            .setDescription('Rola support dla tej kategorii')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Usuń kategorię ticketów')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('ID kategorii do usunięcia')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Wyświetl wszystkie kategorie ticketów'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('form')
        .setDescription('Skonfiguruj formularz dla kategorii')
        .addStringOption(option =>
          option.setName('category_id')
            .setDescription('ID kategorii')
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Włącz/wyłącz formularz')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Tytuł formularza')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('form-field')
        .setDescription('Dodaj pole do formularza kategorii')
        .addStringOption(option =>
          option.setName('category_id')
            .setDescription('ID kategorii')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('field_id')
            .setDescription('Unikalny ID pola')
            .setRequired(true)
            .setMaxLength(20))
        .addStringOption(option =>
          option.setName('label')
            .setDescription('Etykieta pola')
            .setRequired(true)
            .setMaxLength(45))
        .addStringOption(option =>
          option.setName('style')
            .setDescription('Typ pola')
            .setRequired(true)
            .addChoices(
              { name: 'Krótki tekst', value: 'short' },
              { name: 'Długi tekst (paragraf)', value: 'paragraph' }
            ))
        .addBooleanOption(option =>
          option.setName('required')
            .setDescription('Czy pole jest wymagane')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('placeholder')
            .setDescription('Tekst podpowiedzi')
            .setRequired(false)
            .setMaxLength(100))
        .addIntegerOption(option =>
          option.setName('min_length')
            .setDescription('Minimalna długość')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(4000))
        .addIntegerOption(option =>
          option.setName('max_length')
            .setDescription('Maksymalna długość')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(4000)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('form-field-remove')
        .setDescription('Usuń pole z formularza')
        .addStringOption(option =>
          option.setName('category_id')
            .setDescription('ID kategorii')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('field_id')
            .setDescription('ID pola do usunięcia')
            .setRequired(true))),

  async execute(interaction) {
    let config = await TicketConfig.findOne({ where: { guildId: interaction.guild.id } });

    if (!config) {
      config = await TicketConfig.create({
        guildId: interaction.guild.id,
        enabled: false,
        categories: []
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const categories = config.categories || [];

    switch (subcommand) {
      case 'add': {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji');
        const color = interaction.options.getString('color');
        const discordCategory = interaction.options.getChannel('discord_category');
        const supportRole = interaction.options.getRole('support_role');

        const newCategory = {
          id: crypto.randomUUID().slice(0, 8),
          name,
          description: description || null,
          emoji: emoji || null,
          color: color || '#5865F2',
          categoryId: discordCategory?.id || null,
          supportRoleIds: supportRole ? [supportRole.id] : [],
          form: {
            enabled: false,
            title: `${name} - Formularz`,
            fields: []
          }
        };

        categories.push(newCategory);
        await config.update({ categories });

        const embed = new EmbedBuilder()
          .setTitle('✅ Kategoria dodana')
          .setColor('#57F287')
          .addFields(
            { name: 'ID', value: `\`${newCategory.id}\``, inline: true },
            { name: 'Nazwa', value: name, inline: true },
            { name: 'Emoji', value: emoji || 'Brak', inline: true }
          )
          .setFooter({ text: 'Użyj /setup-ticket mode:buttons aby wysłać panel z przyciskami' });

        if (description) {
          embed.addFields({ name: 'Opis', value: description });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'remove': {
        const id = interaction.options.getString('id');
        const index = categories.findIndex(c => c.id === id);

        if (index === -1) {
          return interaction.reply({
            content: `❌ Nie znaleziono kategorii o ID: \`${id}\``,
            ephemeral: true
          });
        }

        const removed = categories.splice(index, 1)[0];
        await config.update({ categories });

        return interaction.reply({
          content: `✅ Usunięto kategorię: **${removed.name}** (\`${id}\`)`,
          ephemeral: true
        });
      }

      case 'list': {
        if (categories.length === 0) {
          return interaction.reply({
            content: '📋 Brak skonfigurowanych kategorii.\n\nUżyj `/ticket-category add` aby dodać pierwszą kategorię.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('📋 Kategorie ticketów')
          .setColor('#5865F2');

        let description = '';
        for (const cat of categories) {
          description += `\n**${cat.emoji || '📨'} ${cat.name}**\n`;
          description += `ID: \`${cat.id}\`\n`;
          if (cat.description) description += `Opis: ${cat.description}\n`;
          if (cat.form?.enabled) {
            description += `📝 Formularz: ${cat.form.fields?.length || 0} pól\n`;
          }
          description += '\n';
        }

        embed.setDescription(description);
        embed.setFooter({ text: `Łącznie: ${categories.length} kategorii` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'form': {
        const categoryId = interaction.options.getString('category_id');
        const enabled = interaction.options.getBoolean('enabled');
        const title = interaction.options.getString('title');

        const catIndex = categories.findIndex(c => c.id === categoryId);

        if (catIndex === -1) {
          return interaction.reply({
            content: `❌ Nie znaleziono kategorii o ID: \`${categoryId}\``,
            ephemeral: true
          });
        }

        if (!categories[catIndex].form) {
          categories[catIndex].form = { enabled: false, title: '', fields: [] };
        }

        categories[catIndex].form.enabled = enabled;
        if (title) {
          categories[catIndex].form.title = title;
        }

        await config.update({ categories });

        return interaction.reply({
          content: `✅ Formularz dla kategorii **${categories[catIndex].name}** został ${enabled ? 'włączony' : 'wyłączony'}.`,
          ephemeral: true
        });
      }

      case 'form-field': {
        const categoryId = interaction.options.getString('category_id');
        const fieldId = interaction.options.getString('field_id');
        const label = interaction.options.getString('label');
        const style = interaction.options.getString('style');
        const required = interaction.options.getBoolean('required') ?? true;
        const placeholder = interaction.options.getString('placeholder');
        const minLength = interaction.options.getInteger('min_length');
        const maxLength = interaction.options.getInteger('max_length');

        const catIndex = categories.findIndex(c => c.id === categoryId);

        if (catIndex === -1) {
          return interaction.reply({
            content: `❌ Nie znaleziono kategorii o ID: \`${categoryId}\``,
            ephemeral: true
          });
        }

        if (!categories[catIndex].form) {
          categories[catIndex].form = { enabled: false, title: '', fields: [] };
        }

        // Check max fields (Discord limit is 5)
        if (categories[catIndex].form.fields.length >= 5) {
          return interaction.reply({
            content: '❌ Osiągnięto maksymalną liczbę pól (5). Usuń istniejące pole przed dodaniem nowego.',
            ephemeral: true
          });
        }

        // Check if field ID already exists
        const existingField = categories[catIndex].form.fields.find(f => f.id === fieldId);
        if (existingField) {
          return interaction.reply({
            content: `❌ Pole o ID \`${fieldId}\` już istnieje. Wybierz inne ID lub usuń istniejące pole.`,
            ephemeral: true
          });
        }

        const newField = {
          id: fieldId,
          label,
          style,
          required,
          placeholder: placeholder || null,
          minLength: minLength || null,
          maxLength: maxLength || null
        };

        categories[catIndex].form.fields.push(newField);
        await config.update({ categories });

        const embed = new EmbedBuilder()
          .setTitle('✅ Pole dodane do formularza')
          .setColor('#57F287')
          .addFields(
            { name: 'Kategoria', value: categories[catIndex].name, inline: true },
            { name: 'ID pola', value: `\`${fieldId}\``, inline: true },
            { name: 'Etykieta', value: label, inline: true },
            { name: 'Typ', value: style === 'short' ? 'Krótki tekst' : 'Paragraf', inline: true },
            { name: 'Wymagane', value: required ? 'Tak' : 'Nie', inline: true },
            { name: 'Liczba pól', value: `${categories[catIndex].form.fields.length}/5`, inline: true }
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'form-field-remove': {
        const categoryId = interaction.options.getString('category_id');
        const fieldId = interaction.options.getString('field_id');

        const catIndex = categories.findIndex(c => c.id === categoryId);

        if (catIndex === -1) {
          return interaction.reply({
            content: `❌ Nie znaleziono kategorii o ID: \`${categoryId}\``,
            ephemeral: true
          });
        }

        if (!categories[catIndex].form?.fields) {
          return interaction.reply({
            content: '❌ Ta kategoria nie ma skonfigurowanego formularza.',
            ephemeral: true
          });
        }

        const fieldIndex = categories[catIndex].form.fields.findIndex(f => f.id === fieldId);

        if (fieldIndex === -1) {
          return interaction.reply({
            content: `❌ Nie znaleziono pola o ID: \`${fieldId}\``,
            ephemeral: true
          });
        }

        const removed = categories[catIndex].form.fields.splice(fieldIndex, 1)[0];
        await config.update({ categories });

        return interaction.reply({
          content: `✅ Usunięto pole **${removed.label}** (\`${fieldId}\`) z formularza kategorii **${categories[catIndex].name}**.`,
          ephemeral: true
        });
      }

      default:
        return interaction.reply({ content: '❌ Nieznana subkomenda.', ephemeral: true });
    }
  }
};
