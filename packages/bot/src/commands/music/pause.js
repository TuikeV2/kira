const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const checkDjRole = require('../../utils/checkDjRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume the current song'),

  async execute(interaction) {
    if (!await checkDjRole(interaction)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('Tylko uzytkownicy z rola DJ moga uzywac tej komendy!')],
        ephemeral: true
      });
    }

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

    const isPaused = queue.paused;
    await player.setPaused(!isPaused);
    queue.paused = !isPaused;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00ff00')
          .setDescription(isPaused ? 'Muzyka wznowiona!' : 'Muzyka wstrzymana!')
      ]
    });
  }
};
