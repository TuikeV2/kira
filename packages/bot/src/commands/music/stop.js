const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const checkDjRole = require('../../utils/checkDjRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction) {
    if (!await checkDjRole(interaction)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('Tylko uzytkownicy z rola DJ moga uzywac tej komendy!')],
        ephemeral: true
      });
    }

    const queue = interaction.client.queue.get(interaction.guildId);
    const player = interaction.client.shoukaku.players.get(interaction.guildId);

    if (!queue || !player) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('Nie ma aktualnie odtwarzanej muzyki!')
        ],
        ephemeral: true
      });
    }

    // Check 24/7 mode
    let is247 = false;
    try {
      const guildData = await models.Guild.findOne({ where: { guildId: interaction.guild.id } });
      const musicSettings = guildData?.settings?.music;
      if (musicSettings?.enabled && musicSettings?.twentyFourSeven) {
        is247 = true;
      }
    } catch (err) {
      // Use default behavior if settings can't be loaded
    }

    if (is247) {
      // In 24/7 mode: clear queue and stop current track but don't disconnect
      queue.clear();
      await player.stopTrack();

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription('Kolejka wyczyszczona! Bot pozostaje na kanale (tryb 24/7).')
        ]
      });
    } else {
      queue.clear();
      await interaction.client.shoukaku.leaveVoiceChannel(interaction.guildId);
      interaction.client.queue.delete(interaction.guildId);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription('Muzyka zatrzymana i kolejka wyczyszczona!')
        ]
      });
    }
  }
};
