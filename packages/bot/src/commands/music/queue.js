const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number')
        .setMinValue(1)
    ),

  async execute(interaction) {
    const queue = interaction.client.queue.get(interaction.guildId);

    if (!queue || !queue.current) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('Kolejka jest pusta!')
        ],
        ephemeral: true
      });
    }

    const currentTrack = queue.current;
    const tracks = queue.tracks;
    const page = interaction.options.getInteger('page') || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(tracks.length / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const queueList = tracks
      .slice(startIndex, endIndex)
      .map((track, index) => {
        const duration = track.info.isStream ? 'Na zywo' : formatDuration(track.info.length);
        return `**${startIndex + index + 1}.** [${track.info.title}](${track.info.uri}) - \`${duration}\``;
      })
      .join('\n') || 'Brak utworow w kolejce';

    const currentDuration = currentTrack.info.isStream ? 'Na zywo' : formatDuration(currentTrack.info.length);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`Kolejka muzyki - ${interaction.guild.name}`)
      .setDescription(`**Teraz gra:**\n[${currentTrack.info.title}](${currentTrack.info.uri}) - \`${currentDuration}\`\n\n**Nastepne utwory:**\n${queueList}`)
      .setFooter({ text: `Strona ${page}/${totalPages} | ${tracks.length} utworow w kolejce` })
      .setThumbnail(currentTrack.info.artworkUrl || null);

    await interaction.reply({ embeds: [embed] });
  }
};
