const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const { search, playTrack, formatDuration } = require('../../utils/musicManager');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name or URL (YouTube, Spotify, SoundCloud)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('Musisz byc na kanale glosowym!')
        ]
      });
    }

    if (!channel.permissionsFor(interaction.guild.members.me).has(['Connect', 'Speak'])) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('Nie mam uprawnien do dolaczenia lub mowienia na tym kanale!')
        ]
      });
    }

    const query = interaction.options.getString('query');

    let defaultVolume = 80;
    try {
      const guildData = await models.Guild.findOne({ where: { guildId: interaction.guild.id } });
      const musicSettings = guildData?.settings?.music;
      if (musicSettings?.defaultVolume) {
        defaultVolume = musicSettings.defaultVolume;
      }
    } catch (err) {
      // Use defaults if settings can't be loaded
    }

    try {
      const result = await search(query);

      if (!result || result.loadType === 'empty' || result.loadType === 'error') {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription(`Nie znaleziono wynikow dla: **${query}**`)
          ]
        });
      }

      let tracks;
      if (result.loadType === 'playlist') {
        tracks = [...result.data.tracks];
      } else if (result.loadType === 'track') {
        tracks = [result.data];
      } else if (result.loadType === 'search') {
        tracks = [result.data[0]];
      } else {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription(`Nie znaleziono wynikow dla: **${query}**`)
          ]
        });
      }

      if (!tracks.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription(`Nie znaleziono wynikow dla: **${query}**`)
          ]
        });
      }

      for (const t of tracks) {
        t.requestedBy = interaction.user;
      }

      const firstTrack = tracks.shift();
      const metadata = { channel: interaction.channel, requestedBy: interaction.user };

      const { queue, track } = await playTrack(interaction.guild.id, null, channel, firstTrack, metadata, defaultVolume);
      if (tracks.length) {
        queue.addMany(tracks);
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(queue.current === track && queue.size === 0 ? 'Teraz gra' : 'Dodano do kolejki')
        .setDescription(`**[${track.info.title}](${track.info.uri})**`)
        .addFields(
          { name: 'Autor', value: track.info.author || 'Nieznany', inline: true },
          { name: 'Dlugosc', value: track.info.isStream ? 'Na zywo' : formatDuration(track.info.length), inline: true }
        )
        .setThumbnail(track.info.artworkUrl || null)
        .setFooter({ text: `Dodane przez ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

      if (result.loadType === 'playlist' && result.data?.tracks?.length > 1) {
        embed.addFields({ name: 'Playlista', value: `Dodano ${result.data.tracks.length} utworow`, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

      logger.info(`Music: ${interaction.user.username} added "${track.info.title}" in ${interaction.guild.name}`);

    } catch (error) {
      logger.error('Play command error:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription(`Wystapil blad podczas odtwarzania: ${error.message}`)
        ]
      });
    }
  }
};
