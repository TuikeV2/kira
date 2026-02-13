const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction) {
    const queue = interaction.client.queue.get(interaction.guildId);
    const player = interaction.client.shoukaku.players.get(interaction.guildId);

    if (!queue || !queue.current || !player) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('Nie ma aktualnie odtwarzanej muzyki!')
        ],
        ephemeral: true
      });
    }

    const track = queue.current;
    const progress = queue.createProgressBar(player.position, track.info.length);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Teraz odtwarzane')
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .addFields(
        { name: 'Autor', value: track.info.author || 'Nieznany', inline: true },
        { name: 'Dlugosc', value: track.info.isStream ? 'Na zywo' : formatDuration(track.info.length), inline: true },
        { name: 'Glosnosc', value: `${queue.volume}%`, inline: true },
        { name: 'Postep', value: progress || 'Brak danych' }
      )
      .setThumbnail(track.info.artworkUrl || null)
      .setFooter({ text: `Dodane przez ${track.requestedBy?.username || 'Nieznany'}` });

    await interaction.reply({ embeds: [embed] });
  }
};
