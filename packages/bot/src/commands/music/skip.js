const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const checkDjRole = require('../../utils/checkDjRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

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

    const currentTrack = queue.current;
    await player.stopTrack();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00ff00')
          .setDescription(`Pominiety: **${currentTrack.info.title}**`)
      ]
    });
  }
};
