const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { models } = require('@kira/shared');
const { createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Zobacz ranking XP na serwerze')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Typ rankingu')
        .setRequired(false)
        .addChoices(
          { name: 'XP (domyslny)', value: 'xp' },
          { name: 'Poziom', value: 'level' },
          { name: 'Wiadomosci', value: 'messages' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Numer strony (10 uzytkownikow na strone)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Sprawdz czy system poziomow jest wlaczony
      const guild = await models.Guild.findOne({
        where: { guildId: interaction.guildId, isActive: true }
      });

      if (!guild?.settings?.levelingEnabled) {
        return interaction.editReply({
          embeds: [createErrorEmbed('System wylaczony', 'System poziomow nie jest wlaczony na tym serwerze.')]
        });
      }

      const type = interaction.options.getString('type') || 'xp';
      let page = interaction.options.getInteger('page') || 1;
      const perPage = 10;

      // Okresl pole sortowania
      let orderField;
      let typeLabel;
      let typeEmoji;
      switch (type) {
        case 'level':
          orderField = 'level';
          typeLabel = 'Poziom';
          typeEmoji = '';
          break;
        case 'messages':
          orderField = 'totalMessages';
          typeLabel = 'Wiadomosci';
          typeEmoji = '';
          break;
        default:
          orderField = 'xp';
          typeLabel = 'XP';
          typeEmoji = '';
      }

      // Pobierz calkowita liczbe uzytkownikow
      const totalCount = await models.UserLevel.count({
        where: { guildId: interaction.guildId }
      });

      if (totalCount === 0) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Brak danych', 'Nikt jeszcze nie zdobyl punktow doswiadczenia na tym serwerze.')]
        });
      }

      const totalPages = Math.ceil(totalCount / perPage);
      if (page > totalPages) page = totalPages;

      // Funkcja do generowania embeda
      const generateEmbed = async (currentPage) => {
        const offset = (currentPage - 1) * perPage;

        const users = await models.UserLevel.findAll({
          where: { guildId: interaction.guildId },
          order: [[orderField, 'DESC'], ['xp', 'DESC']],
          limit: perPage,
          offset: offset
        });

        // Znajdz pozycje aktualnego uzytkownika
        const currentUserRank = await models.UserLevel.count({
          where: {
            guildId: interaction.guildId,
            [orderField]: {
              [require('sequelize').Op.gt]: (await models.UserLevel.findOne({
                where: { discordId: interaction.user.id, guildId: interaction.guildId }
              }))?.[orderField] || 0
            }
          }
        }) + 1;

        const currentUserData = await models.UserLevel.findOne({
          where: { discordId: interaction.user.id, guildId: interaction.guildId }
        });

        // Buduj liste
        const leaderboardLines = await Promise.all(
          users.map(async (user, index) => {
            const rank = offset + index + 1;

            // Medale dla top 3
            let medal = '';
            if (rank === 1) medal = '';
            else if (rank === 2) medal = '';
            else if (rank === 3) medal = '';

            // Pobierz nazwe uzytkownika z Discorda
            let username;
            let isCurrentUser = user.discordId === interaction.user.id;
            try {
              const member = await interaction.guild.members.fetch(user.discordId);
              username = member.user.username;
            } catch {
              username = `User (...${user.discordId.slice(-4)})`;
            }

            // Formatuj linie
            const rankStr = medal ? `${medal}` : `#${rank}`;
            const highlight = isCurrentUser ? '**' : '';

            let statValue;
            switch (type) {
              case 'level':
                statValue = `Lvl ${user.level} (${user.xp.toLocaleString()} XP)`;
                break;
              case 'messages':
                statValue = `${user.totalMessages.toLocaleString()} wiadomosci`;
                break;
              default:
                statValue = `${user.xp.toLocaleString()} XP (Lvl ${user.level})`;
            }

            return `${rankStr} ${highlight}${username}${highlight}\n   ${statValue}`;
          })
        );

        const embed = new EmbedBuilder()
          .setColor('#ffd700')
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL()
          })
          .setTitle(`${typeEmoji} Ranking - ${typeLabel}`)
          .setDescription(leaderboardLines.join('\n\n'))
          .setFooter({
            text: `Strona ${currentPage}/${totalPages} | ${totalCount} uzytkownikow | Twoja pozycja: #${currentUserRank}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();

        // Dodaj statystyki aktualnego uzytkownika jesli nie jest na tej stronie
        if (currentUserData && !users.some(u => u.discordId === interaction.user.id)) {
          let yourStat;
          switch (type) {
            case 'level':
              yourStat = `Poziom ${currentUserData.level}`;
              break;
            case 'messages':
              yourStat = `${currentUserData.totalMessages.toLocaleString()} wiadomosci`;
              break;
            default:
              yourStat = `${currentUserData.xp.toLocaleString()} XP`;
          }
          embed.addFields({
            name: 'Twoje statystyki',
            value: `Pozycja: **#${currentUserRank}** | ${yourStat}`,
            inline: false
          });
        }

        return embed;
      };

      // Funkcja do generowania przyciskow
      const generateButtons = (currentPage) => {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('lb_first')
              .setEmoji('')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 1),
            new ButtonBuilder()
              .setCustomId('lb_prev')
              .setEmoji('')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 1),
            new ButtonBuilder()
              .setCustomId('lb_page')
              .setLabel(`${currentPage}/${totalPages}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('lb_next')
              .setEmoji('')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === totalPages),
            new ButtonBuilder()
              .setCustomId('lb_last')
              .setEmoji('')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === totalPages)
          );
        return row;
      };

      // Wyslij poczatkowa wiadomosc
      const embed = await generateEmbed(page);
      const buttons = generateButtons(page);

      const message = await interaction.editReply({
        embeds: [embed],
        components: totalPages > 1 ? [buttons] : []
      });

      // Jesli tylko jedna strona, nie dodawaj kolektora
      if (totalPages <= 1) return;

      // Utworz kolektor na przyciski
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000 // 2 minuty
      });

      collector.on('collect', async (i) => {
        // Sprawdz czy to ten sam uzytkownik
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'Tylko osoba ktora uzyła komendy moze nawigowac po rankingu.',
            ephemeral: true
          });
          return;
        }

        // Zaktualizuj strone
        switch (i.customId) {
          case 'lb_first':
            page = 1;
            break;
          case 'lb_prev':
            page = Math.max(1, page - 1);
            break;
          case 'lb_next':
            page = Math.min(totalPages, page + 1);
            break;
          case 'lb_last':
            page = totalPages;
            break;
        }

        const newEmbed = await generateEmbed(page);
        const newButtons = generateButtons(page);

        await i.update({
          embeds: [newEmbed],
          components: [newButtons]
        });
      });

      collector.on('end', async () => {
        // Usun przyciski po zakonczeniu
        try {
          await message.edit({
            components: []
          });
        } catch (e) {
          // Wiadomosc mogla zostac usunieta
        }
      });

      // Zapisz uzycie komendy
      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'leaderboard',
        success: true
      });

    } catch (error) {
      logger.error('Leaderboard command error:', error);
      await interaction.editReply({
        embeds: [createErrorEmbed('Blad', 'Nie udalo sie pobrac rankingu.')]
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'leaderboard',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
